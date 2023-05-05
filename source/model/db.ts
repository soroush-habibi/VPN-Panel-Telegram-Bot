import mongodb from 'mongodb';
import axios from 'axios';
import crypto from 'crypto';

interface config {
    add: string,
    aid: string,
    host: string,
    id: string,
    net: string,
    path: string,
    port: string,
    ps: string,
    scy: string,
    sni: string,
    tls: string,
    type: string,
    v: string,
    rowId?: string,
    expiryTime?: string
}

interface session {
    chat_id: number,
    token: string,
    admin: boolean
}

interface stats {
    qr_clicks: number,
    config_clicks: number
}

interface ticket {
    _id: mongodb.ObjectId,
    token: string,
    chat_id: number,
    message: string,
    answer: string
}

interface loginSessionId {
    ip: string,
    sessionId: any
}

export default class db {
    private static client: mongodb.MongoClient;
    private static ids: loginSessionId[];
    static async connect(func: (client: mongodb.MongoClient) => void, ips: string[]) {
        const client = await mongodb.MongoClient.connect(process.env.DB_URL || "mongodb://127.0.0.1:27017");

        this.client = client;

        this.ids = [];

        for (let ip of ips) {
            const request = await axios.post(`http://${ip}:2080/login`, { username: "arp", password: "arp" });
            if (request.headers['set-cookie']) {
                const result: loginSessionId = {
                    ip: ip,
                    sessionId: request.headers['set-cookie']
                }
                this.ids.push(result);
            }
        }

        func(client);
    }

    static async checkConfig(token: string): Promise<boolean> {
        for (let id of this.ids) {
            const request = await axios.post(`http://${id.ip}:2080/xui/inbound/list`, undefined, {
                headers: {
                    cookie: id.sessionId,
                }
            });

            for (let obj of request.data.obj) {
                const t = JSON.parse(obj.settings).clients[0].id;

                if (token === t) {
                    return true;
                }
            }
        }

        return false;
    }


    static async getConfig(token: string): Promise<config | undefined> {
        for (let id of this.ids) {
            const request = await axios.post(`http://${id.ip}:2080/xui/inbound/list`, undefined, {
                headers: {
                    cookie: id.sessionId,
                }
            });

            for (let obj of request.data.obj) {
                const t = JSON.parse(obj.settings).clients[0].id;

                if (token === t) {
                    const result: config = {
                        add: id.ip,
                        aid: "0",
                        host: "",
                        id: t,
                        net: "ws",
                        path: "/",
                        port: String(obj.port),
                        ps: obj.remark,
                        scy: "auto",
                        sni: "",
                        tls: "",
                        type: "none",
                        v: "2",
                        rowId: obj.id,
                        expiryTime: obj.expiryTime
                    }

                    return result;
                }
            }
        }

        return undefined;
    }

    static async getConfigs(ip: string, page: number): Promise<config[]> {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        });

        if (!session) {
            throw new Error("IP is not valid!");
        }

        const request = await axios.post(`http://${ip}:2080/xui/inbound/list`, undefined, {
            headers: {
                cookie: session.sessionId,
            }
        });

        let result: config[] = [];

        for (let obj of request.data.obj) {
            const t = JSON.parse(obj.settings).clients[0].id;

            const config: config = {
                add: ip,
                aid: "0",
                host: "",
                id: t,
                net: "ws",
                path: "/",
                port: String(obj.port),
                ps: obj.remark,
                scy: "auto",
                sni: "",
                tls: "",
                type: "none",
                v: "2",
                rowId: obj.id,
                expiryTime: obj.expiryTime
            }

            result.push(config);
        }

        if (result.length > (page - 1) * 5) {
            return result.slice((page - 1) * 5, page * 5);
        } else {
            return [];
        }

        return result;
    }

    static async addConfig(remark: string, ip: string, expiryTime: Date, port: Number): Promise<boolean> {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        });

        if (!session) {
            throw new Error("IP is not valid!");
        }

        const formData = new FormData();
        formData.append("up", "0");
        formData.append("down", "0");
        formData.append("total", "0");
        formData.append("remark", remark);
        formData.append("enable", "true");
        formData.append("expiryTime", String(expiryTime.getTime()));
        formData.append("listen", "");
        formData.append("port", String(port));
        formData.append("protocol", "vmess");
        formData.append("settings", `{
            "clients": [
              {
                "id": "${crypto.randomUUID()}",
                "alterId": 0
              }
            ],
            "disableInsecureEncryption": false
          }`);
        formData.append("streamSettings", `{
            "network": "ws",
            "security": "none",
            "wsSettings": {
              "path": "/",
              "headers": {}
            }
          }`);
        formData.append("sniffing", `{
            "enabled": true,
            "destOverride": [
              "http",
              "tls"
            ]
          }`);

        try {
            const request = await axios({
                method: "post",
                url: `http://${session.ip}:2080/xui/inbound/add`,
                data: formData,
                headers: { cookie: session.sessionId }
            });

            if (request.data.success) {
                return true;
            } else {
                throw new Error(request.data.msg)
            }
        } catch (e) {
            return false;
        }
    }

    static async removeConfig(ip: string, id: number): Promise<boolean> {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        })

        if (!session) {
            throw new Error("IP is not valid!");
        }

        try {
            const request = await axios.post(`http://${session.ip}:2080/xui/inbound/del/${id}`, undefined, {
                headers: {
                    cookie: session.sessionId,
                }
            });

            if (request.data.success) {
                return true;
            } else {
                throw new Error(request.data.msg)
            }
        } catch (e) {
            return false;
        }
    }

    static async updateExpiryDate(token: string, newDate: Date): Promise<boolean> {
        const config = await this.getConfig(token);
        const id = config?.rowId;

        if (!config) {
            throw new Error("Token not found!")
        }

        const session = this.ids.find((value) => {
            if (value.ip === config?.add) {
                return true;
            }
        });

        if (!session) {
            throw new Error("IP is not valid!");
        }

        const formData = new FormData();
        formData.append("up", "0");
        formData.append("down", "0");
        formData.append("total", "0");
        formData.append("remark", config.ps || "undefined");
        formData.append("enable", "true");
        formData.append("expiryTime", String(newDate.getTime()));
        formData.append("listen", "");
        formData.append("port", config.port || "0");
        formData.append("protocol", "vmess");
        formData.append("settings", `{
            "clients": [
              {
                "id": "${config.id}",
                "alterId": 0
              }
            ],
            "disableInsecureEncryption": false
          }`);
        formData.append("streamSettings", `{
            "network": "ws",
            "security": "none",
            "wsSettings": {
              "path": "/",
              "headers": {}
            }
          }`);
        formData.append("sniffing", `{
            "enabled": true,
            "destOverride": [
              "http",
              "tls"
            ]
          }`);

        try {
            const request = await axios({
                method: "post",
                url: `http://${session.ip}:2080/xui/inbound/update/${id}`,
                data: formData,
                headers: { cookie: session.sessionId }
            });

            if (request.data.success) {
                return true;
            } else {
                throw new Error(request.data.msg);
            }
        } catch (e) {
            return false;
        }
    }

    static async addSession(chatId: number, token: string, admin: boolean = false): Promise<void> {
        await this.client.db("vpnBot").collection("sessions").insertOne({ chat_id: chatId, token: token, admin: admin });
    }

    static async removeSession(chatId: number): Promise<void> {
        await this.client.db("vpnBot").collection("sessions").deleteOne({ chat_id: chatId });
    }

    static async getSessions(): Promise<session[]> {
        const data = await this.client.db("vpnBot").collection<session>("sessions").find({}).toArray();

        return data;
    }

    static async clickQr(): Promise<void> {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { qr_clicks: 1 } });
    }

    static async clickConfig(): Promise<void> {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { config_clicks: 1 } });
    }

    static async getStats(): Promise<stats | null> {
        const data = await this.client.db("vpnBot").collection<stats>("statistics").findOne({});

        return data;
    }

    static async addTicket(token: string, chatId: number, message: string): Promise<string> {
        const data = await this.client.db("vpnBot").collection("tickets").insertOne({ token: token, chat_id: chatId, message: message, answer: "" });

        return String(data.insertedId);
    }

    static async getTicket(id: string): Promise<ticket | null> {
        const data = await this.client.db("vpnBot").collection<ticket>("tickets").findOne({ _id: new mongodb.ObjectId(id) });

        return data;
    }

    static async answerTicket(id: string, answer: string): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("tickets").updateOne({ _id: new mongodb.ObjectId(id) }, { $set: { answer: answer } });

        return data.modifiedCount > 0 ? true : false;
    }
}
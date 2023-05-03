import mongodb from 'mongodb';
import axios from 'axios';
export default class db {
    static async connect(func, ips) {
        const client = await mongodb.MongoClient.connect(process.env.DB_URL || "mongodb://127.0.0.1:27017");
        this.client = client;
        this.ids = [];
        for (let ip of ips) {
            const request = await axios.post(`http://${ip}:2080/login`, { username: "arp", password: "arp" });
            if (request.headers['set-cookie']) {
                const result = {
                    ip: ip,
                    sessionId: request.headers['set-cookie']
                };
                this.ids.push(result);
            }
        }
        func(client);
    }
    static async checkConfig(token) {
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
    static async getConfig(token) {
        for (let id of this.ids) {
            const request = await axios.post(`http://${id.ip}:2080/xui/inbound/list`, undefined, {
                headers: {
                    cookie: id.sessionId,
                }
            });
            for (let obj of request.data.obj) {
                const t = JSON.parse(obj.settings).clients[0].id;
                if (token === t) {
                    const result = {
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
                        v: "2"
                    };
                    return result;
                }
            }
        }
        return undefined;
    }
    static async getConfigs(ip) {
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
        let result = [];
        for (let obj of request.data.obj) {
            const t = JSON.parse(obj.settings).clients[0].id;
            const config = {
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
                v: "2"
            };
            result.push(config);
        }
        return result;
    }
    static async addConfig(remark, ip, expiryTime, port) {
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
            const request = await axios.post(`http://${session.ip}:2080/xui/inbound/add`, {
                formData
            }, {
                headers: {
                    cookie: session.sessionId,
                }
            });
            if (request.data.success) {
                return true;
            }
            else {
                throw new Error(request.data.msg);
            }
        }
        catch (e) {
            return false;
        }
    }
    static async removeConfig(ip, id) {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        });
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
            }
            else {
                throw new Error(request.data.msg);
            }
        }
        catch (e) {
            return false;
        }
    }
    static async updateExpiryDate(id, token, newDate) {
        const config = await this.getConfig(token);
        if (!config) {
            throw new Error("Token not found!");
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
            const request = await axios.post(`http://${session.sessionId}:2080/xui/inbound/update/${id}`, {
                formData
            }, {
                headers: {
                    cookie: session.sessionId,
                }
            });
            if (request.data.success) {
                return true;
            }
            else {
                throw new Error(request.data.msg);
            }
        }
        catch (e) {
            return false;
        }
    }
    static async addSession(chatId, token, admin = false) {
        await this.client.db("vpnBot").collection("sessions").insertOne({ chat_id: chatId, token: token, admin: admin });
    }
    static async removeSession(chatId) {
        await this.client.db("vpnBot").collection("sessions").deleteOne({ chat_id: chatId });
    }
    static async getSessions() {
        const data = await this.client.db("vpnBot").collection("sessions").find({}).toArray();
        return data;
    }
    static async clickQr() {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { qr_clicks: 1 } });
    }
    static async clickConfig() {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { config_clicks: 1 } });
    }
    static async getStats() {
        const data = await this.client.db("vpnBot").collection("statistics").findOne({});
        return data;
    }
    static async addTicket(token, chatId, message) {
        const data = await this.client.db("vpnBot").collection("tickets").insertOne({ token: token, chat_id: chatId, message: message, answer: "" });
        return String(data.insertedId);
    }
    static async getTicket(id) {
        const data = await this.client.db("vpnBot").collection("tickets").findOne({ _id: new mongodb.ObjectId(id) });
        return data;
    }
    static async answerTicket(id, answer) {
        const data = await this.client.db("vpnBot").collection("tickets").updateOne({ _id: new mongodb.ObjectId(id) }, { $set: { answer: answer } });
        return data.modifiedCount > 0 ? true : false;
    }
}

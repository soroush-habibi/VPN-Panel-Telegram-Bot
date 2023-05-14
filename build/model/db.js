import mongodb from 'mongodb';
import axios from 'axios';
import crypto from 'crypto';
export default class db {
    static async connect(func, ips) {
        const client = await mongodb.MongoClient.connect(process.env.DB_URL || "mongodb://127.0.0.1:27017");
        this.client = client;
        this.ids = [];
        for (let ip of ips) {
            const request = await axios.post(`http://${ip}:${process.env.PANEL_PORT || 2080}/login`, {
                username: process.env.PANEL_USERNAME || "arp",
                password: process.env.PANEL_PASSWORD || "arp"
            });
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
    static async init() {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $set: { config_clicks: 0, qr_clicks: 0 } }, { upsert: true });
    }
    static async checkConfig(token) {
        for (let id of this.ids) {
            const request = await axios.post(`http://${id.ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/list`, undefined, {
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
            const request = await axios.post(`http://${id.ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/list`, undefined, {
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
                        v: "2",
                        rowId: obj.id,
                        expiryTime: obj.expiryTime
                    };
                    return result;
                }
            }
        }
        return undefined;
    }
    static async getConfigs(ip, page) {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        });
        if (!session) {
            throw new Error("IP is not valid!");
        }
        const request = await axios.post(`http://${ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/list`, undefined, {
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
                v: "2",
                rowId: obj.id,
                expiryTime: obj.expiryTime
            };
            result.push(config);
        }
        if (result.length > (page - 1) * 5) {
            return result.slice((page - 1) * 5, page * 5);
        }
        else {
            return [];
        }
    }
    static async addConfig(remark, ip, expiryTime) {
        const session = this.ids.find((value) => {
            if (value.ip === ip) {
                return true;
            }
        });
        if (!session) {
            throw new Error("IP is not valid!");
        }
        const port = Math.floor((Math.random() * 64535) + 999);
        const token = crypto.randomUUID();
        const formData = new FormData();
        formData.append("up", "0");
        formData.append("down", "0");
        formData.append("total", "0");
        formData.append("remark", remark);
        formData.append("enable", "true");
        formData.append("expiryTime", String(expiryTime?.getTime() || ""));
        formData.append("listen", "");
        formData.append("port", String(port));
        formData.append("protocol", "vmess");
        formData.append("settings", `{
            "clients": [
              {
                "id": "${token}",
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
                url: `http://${session.ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/add`,
                data: formData,
                headers: { cookie: session.sessionId }
            });
            if (request.data.success) {
                return { token: token, port: port };
            }
            else {
                throw new Error(request.data.msg);
            }
        }
        catch (e) {
            return undefined;
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
            const request = await axios.post(`http://${session.ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/del/${id}`, undefined, {
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
    static async updateExpiryDate(token, newDate) {
        const config = await this.getConfig(token);
        const id = config?.rowId;
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
            const request = await axios({
                method: "post",
                url: `http://${session.ip}:${process.env.PANEL_PORT || 2080}/xui/inbound/update/${id}`,
                data: formData,
                headers: { cookie: session.sessionId }
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
    static async getServersUsage() {
        let result = [];
        try {
            for (let id of this.ids) {
                const request = await axios.post(`http://${id.ip}:${process.env.PANEL_PORT || 2080}/server/status`, undefined, {
                    headers: {
                        cookie: id.sessionId,
                    }
                });
                result.push({
                    ip: id.ip,
                    dataReceived: Number(request.data.obj.netTraffic.recv),
                    dataSent: Number(request.data.obj.netTraffic.sent)
                });
            }
        }
        catch (e) {
            throw new Error("Failed to fetch data");
        }
        return result;
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

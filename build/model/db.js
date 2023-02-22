import mongodb from 'mongodb';
export default class db {
    static async connect(func) {
        const client = await mongodb.MongoClient.connect("mongodb://soroush:Q631YNHEf3SuD@127.0.0.1:27017");
        this.client = client;
        func(client);
    }
    static async checkSub(token) {
        const data = await this.client.db("vpnBot").collection("subs").findOne({ token: token });
        return data ? true : false;
    }
    static async getSub(token) {
        const data = await this.client.db("vpnBot").collection("subs").findOne({ token: token }, { projection: { _id: 0 } });
        if (data) {
            return data;
        }
        else {
            return undefined;
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
    static async addConfig(token, config) {
        const data = await this.client.db("vpnBot").collection("subs").updateOne({ token: token }, { $push: { configs: config } });
        return data.modifiedCount > 0 ? true : false;
    }
    static async removeConfig(token, config) {
        const data = await this.client.db("vpnBot").collection("subs").updateOne({ token: token }, { $pull: { configs: config } });
        return data.modifiedCount > 0 ? true : false;
    }
    static async addUser(token, expiryDate, admin) {
        const data = await this.client.db("vpnBot").collection("subs").insertOne({ token: token, expiry_date: expiryDate, admin: admin, configs: [] });
        return data.acknowledged;
    }
}

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
    static async getSubs(page) {
        const data = await this.client.db("vpnBot").collection("subs").find({ admin: false }, { projection: { _id: 0 } }).skip((page - 1) * 5).limit(5).toArray();
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
    static async addTicket(token, chatId, message) {
        const data = await this.client.db("vpnBot").collection("tickets").insertOne({ token: token, chat_id: chatId, message: message, answer: "" });
        return data.insertedId;
    }
    static async getTicket(id) {
        const data = await this.client.db("vpnBot").collection("tickets").findOne({ _id: new mongodb.ObjectId(id) });
        return data;
    }
    static async answerTicket(id, answer) {
        const data = await this.client.db("vpnBot").collection("tickets").updateOne({ _id: new mongodb.ObjectId(id) }, { $set: { answer: answer } });
        return data.modifiedCount > 0 ? true : false;
    }
    static async updateExpiryDate(token, newDate) {
        const data = await this.client.db("vpnBot").collection("subs").updateOne({ token: token }, { $set: { expiry_date: newDate } });
        return data.modifiedCount > 0 ? true : false;
    }
}

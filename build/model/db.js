import mongodb from 'mongodb';
export default class db {
    static async connect(func) {
        const client = await mongodb.MongoClient.connect("mongodb://127.0.0.1:27017");
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
}

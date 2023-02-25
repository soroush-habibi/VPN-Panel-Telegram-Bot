import mongodb from 'mongodb';

interface config {
    add: string,
    aid: string,
    alpn: string,
    fp: string,
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
    v: string

}

interface sub {
    token: string,
    expiry_date: Date,
    admin: boolean,
    configs: config[]
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

export default class db {
    private static client: mongodb.MongoClient;
    static async connect(func: (client: mongodb.MongoClient) => void) {
        const client = await mongodb.MongoClient.connect("mongodb://soroush:Q631YNHEf3SuD@127.0.0.1:27017");

        this.client = client;

        func(client);
    }

    static async checkSub(token: string): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("subs").findOne({ token: token });

        return data ? true : false;
    }


    static async getSub(token: string): Promise<sub | undefined> {
        const data: sub = await this.client.db("vpnBot").collection("subs").findOne({ token: token }, { projection: { _id: 0 } });

        if (data) {
            return data;
        } else {
            return undefined;
        }
    }

    static async getSubs(page: number): Promise<sub[] | undefined> {
        const data = await this.client.db("vpnBot").collection("subs").find({ admin: false }, { projection: { _id: 0 } }).skip((page - 1) * 5).limit(5).toArray();

        if (data) {
            return data;
        } else {
            return undefined;
        }
    }

    static async addSession(chatId: number, token: string, admin: boolean = false): Promise<void> {
        await this.client.db("vpnBot").collection("sessions").insertOne({ chat_id: chatId, token: token, admin: admin });
    }

    static async removeSession(chatId: number): Promise<void> {
        await this.client.db("vpnBot").collection("sessions").deleteOne({ chat_id: chatId });
    }

    static async getSessions(): Promise<session[]> {
        const data = await this.client.db("vpnBot").collection("sessions").find({}).toArray();

        return data;
    }

    static async clickQr(): Promise<void> {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { qr_clicks: 1 } });
    }

    static async clickConfig(): Promise<void> {
        await this.client.db("vpnBot").collection("statistics").updateOne({}, { $inc: { config_clicks: 1 } });
    }

    static async getStats(): Promise<stats> {
        const data = await this.client.db("vpnBot").collection("statistics").findOne({});

        return data;
    }

    static async addConfig(token: string, config: object): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("subs").updateOne({ token: token }, { $push: { configs: config } });

        return data.modifiedCount > 0 ? true : false;
    }

    static async removeConfig(token: string, config: object): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("subs").updateOne({ token: token }, { $pull: { configs: config } });

        return data.modifiedCount > 0 ? true : false;
    }

    static async addUser(token: string, expiryDate: Date, admin: boolean): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("subs").insertOne({ token: token, expiry_date: expiryDate, admin: admin, configs: [] });

        return data.acknowledged;
    }
}
import mongodb from 'mongodb';

interface sub {
    token: string,
    expiry_date: Date,
    admin: boolean,
    configs: object[]
}

export default class db {
    private static client: mongodb.MongoClient;
    static async connect(func: (client: mongodb.MongoClient) => void) {
        const client = await mongodb.MongoClient.connect("mongodb://127.0.0.1:27017");

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
}
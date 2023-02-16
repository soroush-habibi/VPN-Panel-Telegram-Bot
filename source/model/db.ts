import mongodb from 'mongodb';

export default class db {
    private static client: mongodb.MongoClient;
    static async connect(func: (client: mongodb.MongoClient) => void) {
        const client = await mongodb.MongoClient.connect("mongodb://127.0.0.1:27017");

        this.client = client;

        func(client);
    }

    static async checkSub(token: string): Promise<boolean> {
        const data = await this.client.db("vpnBot").collection("subs").findOne({ id: token });

        return data ? true : false;
    }

    static async getSub(token: string): Promise<object | undefined> {
        const data: object = await this.client.db("vpnBot").collection("subs").findOne({ id: token }, { projection: { _id: 0 } });

        if (data) {
            return data;
        } else {
            return undefined;
        }
    }
}
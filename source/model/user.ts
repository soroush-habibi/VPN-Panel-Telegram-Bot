export default class userModel {
    private readonly _chatId: number;
    private _token: string = "";
    private _admin: boolean = false;
    private _status: string = "";
    constructor(chatId: number) {
        this._chatId = chatId;
    }

    public get chatId(): number {
        return this._chatId;
    }

    public get token(): string {
        return this._token;
    }

    public set token(token: string) {
        this._token = token;
    }

    public get admin(): boolean {
        return this._admin;
    }

    public set admin(admin: boolean) {
        this._admin = admin;
    }

    public get status(): string {
        return this._status;
    }

    public set status(status: string) {
        this._status = status;
    }
}
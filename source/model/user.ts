export default class userModel {
    private readonly _chatId: number;
    private _token: string = "";
    constructor(chatId: number) {
        this._chatId = chatId;
    }

    public get chatId(): number {
        return this._chatId;
    }

    public get token() {
        return this._token;
    }

    public set token(token: string) {
        this._token = token;
    }
}
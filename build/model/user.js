export default class userModel {
    constructor(chatId) {
        this._token = "";
        this._chatId = chatId;
    }
    get chatId() {
        return this._chatId;
    }
    get token() {
        return this._token;
    }
    set token(token) {
        this._token = token;
    }
}

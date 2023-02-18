export default class userModel {
    constructor(chatId) {
        this._token = "";
        this._admin = false;
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
    get admin() {
        return this._admin;
    }
    set admin(admin) {
        this._admin = admin;
    }
}

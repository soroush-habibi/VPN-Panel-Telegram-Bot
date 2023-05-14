
## Installation

1 - First you should run MongoDB database on your system    
Open this link and follow the guide: https://www.mongodb.com/docs/manual/administration/install-community/    

You can also use official docker image of mongo:

```bash
  docker pull mongo
  docker run -d mongo
```
2 - Now if you sure mongodb is running on your system clone this repository and execute below commands:
```bash
  git clone https://github.com/soroush-habibi/VPN-Panel-Telegram-Bot.git
  cd VPN-Panel-Telegram-Bot
  npm i
```     

3 - Make .env file and add necessary [environment variables](#environment-variables)!

4 - Run bot with this command:
```bash
  npm start
```

5 - Press enter in your terminal and write your server ips in text editor in separate lines.then exit text editor


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`BOT_TOKEN`  Telegram bot token that you get fron Bot Father

`DB_URL`  URL of your mongodb database

`PANEL_USERNAME`  x-ui panel username

`PANEL_PASSWORD`  x-ui panel password

Optional:

`COINBASE_API_KEY` for crypto payment

`PANEL_PORT`  x-ui panel port (default = 2080)
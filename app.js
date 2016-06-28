var restify = require('restify');
var builder = require('botbuilder');

// Create bot and add dialogs
var bot = new builder.BotConnectorBot({ appId: 'YourAppId', appSecret: 'YourAppSecret' });
bot.add('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.beginDialog('/qualificationLevel');
    },
    function (params) {
        session.beginDialog('/topic');
    }
]);

bot.add('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.add('/qualificationLevel', [
    function (session) {
        session.send('Hello %s!', session.userData.name);
        builder.Prompts.text(session, 'Okay, are you studying GCSEs or A-Levels?');
    },
    function (session, results) {
        var qualification = results.response.toUpperCase();
        if (qualification.includes("GCSE")){
            session.userData.qualification = "GCSE";
        }
        else if (qualification.includes("LEVEL")){
            session.userData.qualification = "A-Levels";
        }
        else {
            session.userData.qualification = "nuffin";
        }
        session.endDialog();
    }
]);

bot.add('/topic', [
    function (session) {
        builder.Prompts.text(session, 'Okay, what topic in' + session.userData.qualification + 'would you like to look at?');
    },
    function (session, results) {
        session.send("Fin.");
        session.endDialog();
    }
]);
// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
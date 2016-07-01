var restify = require('restify');
var builder = require('botbuilder');
var natural = require('natural');
var revisionData = require('./guides.json');
var hazel = require('./hazel.json');

// Create bot and add dialogs
var bot = new builder.BotConnectorBot({ appId: 'a48029f7-add5-4285-9542-1057b434cea2', appSecret: 'b71ac1f83aa54d2a8f6fddd829e21504' });

function metadataRevistionInit(session, args, next) {
    console.log(args);
    session.dialogData.difficulty = builder.EntityRecognizer.findEntity(args.entities, 'difficulty');
    session.dialogData.topic = builder.EntityRecognizer.findEntity(args.entities, 'topic');

    if (!session.userData.qualification) {
        session.userData.qualification = builder.EntityRecognizer.findEntity(args.entities, 'qualification');
    }

    session.dialogData.action = 'revision';

    next();
}

function metadataTestInit(session, args, next) {
    session.dialogData.difficulty = builder.EntityRecognizer.findEntity(args.entities, 'difficulty');
    session.dialogData.topic = builder.EntityRecognizer.findEntity(args.entities, 'topic');

    if (!session.userData.qualification) {
        session.userData.qualification = builder.EntityRecognizer.findEntity(args.entities, 'qualification');
    }

    session.dialogData.action = 'test';
    next();
}

function difficultyCheck(session, results, next) {
    if (session.dialogData.difficulty) {
        return next();
    }

    next();
}

function qualificationInit(session, results, next) {
    console.log(session.userData.qualification, 'initQual');
    var qualification = session.userData.qualification;
    if (!qualification) {
        builder.Prompts.choice(session, hazel.qualificationAsk, ['GCSE', 'A-level'], { listStyle: 'none' });
        return;
    }

    next();
}

function qualificationFall(session, results, next) {
    console.log(results);
    var qualification = session.userData.qualification;

    if (!qualification) {
        var qualification = results.response;
        //session.send(hazel.qualificationConfirm[0]);
        session.userData.qualification = qualification;
    }
    next();
}

function qualificationCheck(session, results, next) {
    var qualification = session.userData.qualification;

    if (!qualification) {
        session.endDialog('Sorry, I didn\'t get that.');
        return;
    }
    next();
}

function topicInit(session, results, next) {
    if (session.dialogData.topic) {
        topic = topicDetection(session, session.dialogData.topic.entity);
        if (topic.winkler < 0.7 /* 0.7 for default, above 1 for catch all */) {
            console.log(topic.winkler, 'winkler', topic.guide.guideName, 'name');
            builder.Prompts.confirm(session, 'Sorry, that was ' + topic.guide.guideName + ' right?', { listStyle: 'none' });
            return;
        }
        session.dialogData.topic = topic;
    } else {
        builder.Prompts.text(session, hazel.topicAsk);
        return;
    }
    next();
}

function topicCheck(session, results, next) {
    if (!session.dialogData.topic) {
        if (natural.JaroWinklerDistance('no', results.response) > 0.7) {
            builder.Prompts.choice(session, hazel.topicNegative, ['list', 'random'], { listStyle: 'none' });
            return;
        }
        var topic = topicDetection(session, results.response);
        if (topic.winkler < 0.7 /* 0.7 for default, above 1 for catch all */) {
            console.log(topic.winkler, 'winkler', topic.guide.guideName, 'name');
            builder.Prompts.confirm(session, 'Sorry, that was ' + topic.guide.guideName + ' right?', { listStyle: 'none' });
            return;
        }
        session.dialogData.topic = topic;
    }
    next();
}

function topicDetection(session, input) {
    var topicInput = input;
    var mostLikely = {
        "guide": undefined,
        "winkler": undefined
    }; //perfect for typescript but too far along now to intergrate
    for (var guide of revisionData.guide) {
        var winklerValue = natural.JaroWinklerDistance(topicInput, guide.guideName);
        console.log('guideWinkler', winklerValue, guide.guideName);
        if (mostLikely.guide === undefined) {
            mostLikely.guide = guide;
            mostLikely.winkler = winklerValue;
        } else {
            if (mostLikely.winkler < winklerValue) {
                mostLikely.guide = guide;
                mostLikely.winkler = winklerValue;
            }
        }
    }
    return mostLikely;
}

function topicConfidenceCheck(session, results, next) {
    if (!session.dialogData.topic) {
        console.log(results);
    } else {
        session.endDialog(session.dialogData.topic.guide.guideName + ', here\'s a link: ' + session.dialogData.topic.guide.guideLink + session.dialogData.action);
        delete session.dialogData;
        console.log(session.userData.qualification, 'qual')
        return;
    }
}

bot.add('/', new builder.LuisDialog('https://api.projectoxford.ai/luis/v1/application?id=a48029f7-add5-4285-9542-1057b434cea2&subscription-key=b71ac1f83aa54d2a8f6fddd829e21504')
    .on('test', '/test')
    .on('revise', '/revise')
    .onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."))
);

bot.add('/revise', [metadataRevistionInit, difficultyCheck, qualificationInit, qualificationFall, qualificationCheck, topicInit, topicCheck, topicConfidenceCheck]);

bot.add('/test', [metadataTestInit, difficultyCheck, qualificationInit, qualificationFall, qualificationCheck, topicInit, topicCheck, topicConfidenceCheck]);

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 8000, function() {
    console.log('%s listening to %s', server.name, server.url);
});
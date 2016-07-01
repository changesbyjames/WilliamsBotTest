module.exports = (function() {
  var builder = require('botbuilder');
  
  var waterfall = [qualificationInit, ];
  
  function qualificationInit(session, args, next){
    var qualification = builder.EntityRecognizer.findEntity(args.entities, 'qualification');

    if (!qualification) {
        builder.Prompts.text(session, 'GCSE or A-level?');
    } else {
        session.userData.qualification = qualification;
        next();
    }
  }
  
  function qualificationFall(session, results, next) {
    var qualification = session.userData.qualification;
    
    if (!qualification){
      var qualification = builder.EntityRecognizer.findEntity(results, 'qualification');
      session.userData.qualification = qualification;
    }
    
    next();
  }

  function qualificationCheck(session, results, next) {
    
  }

})();
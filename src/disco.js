var disco = function(defaultVals){

  // HELPER

  function isLowerCase(str){
    return str.toUpperCase() !== str;
  }

  function eachListener(args, cb){

    if(Array.isArray(args[1])){
      for(var i=0; i<args[1].length; i++){
        cb(args[1][i]);
      }
    }
    else{
      for(var i=0; i<args.length-1; i++){
        cb(args[i+1]);
      }
    }
  }

  function eachEvent(EVT, cb){
    var evts = EVT.split(' ');
    for(var i=0; i<evts.length; i++){
      cb(evts[i]);
    }
  }

  function invokeListener(listener, obj, args, isFirst){
    obj._canChange = isFirst;
    listener.apply(obj, args);
    obj._canChange = false;
  }

  function throwError(key, info){
    var errors = {
      UNFOUNDSTATE: 'Unfound state - ' + info,
      UNFOUNDSTATE2:'Unfound state to inject - ' + info,
      NOUPDATE: 'No such update function found - ' + info,
      FIRSTONLY: 'Allowed to change the state ONLY in the first callback of an event.',
      BADNAME: "Invalid state name - "+info
    };
    throw errors[key];
  }

  function warning(key, info){
    var msgs = {
      ALLCAPS: 'Should use all caps for state event name - ' + info
    }
    console.log('WARNING:', msgs[key]);
  }

  function getStatesToInject(func, param, EVT, observableList, observable){
    var argNames = getArgNames(func);
    var out = [];

    for(var i=0; i< argNames.length; i++){

      var name = argNames[i].replace(/\s/g, '');

      if( name !== '' ){
        if(name === 'EVT'){
          out[i] = { type: EVT, param: param, target: observable };
        }
        else{
          var state = observableList[name];
          if( state === undefined){
            throwError('UNFOUNDSTATE2', name);
          }
          else{
            out[i] = state;
          }
        }
      }
    }
    return out;
  }

  function getArgNames(func){
    return func.toString().split(/\(/)[1].split(/\)/)[0].split(',')
  }

  // LOGGING

  var prevStateStr = '';
  var logCount = 0;

  function logTrigger(evt, listeners, observable, param){
    logCount++;
    var paramStr = JSON.stringify(param);
    console.log(logCount + '\t' + observable._name + " -> "+evt+" param: "+paramStr);
    console.log('\tprevious: '+prevStateStr);
    console.log('\tcurrent:  '+JSON.stringify(observable._val));
  }

  function logEvent(evt, listenersCount, observable){
    var s = listenersCount > 1 ? 's' : '';
    console.log('\tstate '+observable._name+' ' + evt + ' = '+listenersCount+" callback"+s);
  }

  function logEnabled(){
    var url = window.location.href;
    return url.indexOf('?log=true') > -1 || url.indexOf('&log=true') > -1;
  }

  // OBSERVABLE

  var Observable = function(stateName, defaultVal, observableList){

    this._name = stateName; // str
    this._val = defaultVal; // any
    this._listeners = {}; // { function }
    this._observableList = observableList; // [ observable ]
  };

  Observable.prototype.on = function(){ var args = arguments

    var EVT = args[0];

    if(isLowerCase(EVT)){
      warning('ALLCAPS', EVT);
    }

    var that = this;

    eachEvent(EVT, function(evt){
      that._onEachEvent(evt, args);
    });

  };

  Observable.prototype._onEachEvent = function(evt, args){

    if(this._listeners[evt]===undefined){
      this._listeners[evt] = [];
    }

    var that = this;

    eachListener(args, function(listener){
      if(Array.isArray(listener)){
        that._listeners[evt] = that._listeners[evt].concat(listener);
      }
      else{
        that._listeners[evt].push(listener);
      }
    });

    if(logEnabled()) logEvent(evt, this._listeners[evt].length, this);
  };

  Observable.prototype.trigger = function(EVT, param){

    var listeners = this._listeners[EVT];

    if(logEnabled()) prevStateStr = JSON.stringify(this._val);

    var that = this;
    if(Array.isArray(listeners)){
      for(var i=0; i<listeners.length; i++){
        var args = getStatesToInject(listeners[i], param, EVT, that._observableList, that);
        invokeListener(listeners[i], that, args, i===0);
      }
    }

    if(logEnabled()) logTrigger(EVT, listeners, this, param);
  };

  Observable.prototype.val = function(newVal){
    if(newVal === undefined){
      return this._val;
    }
    else{
      if(this._canChange){
        this._val = newVal;
      }
      else{
        throwError('FIRSTONLY');
      }
    }
  };

  // CREATE LIST OF OBSERVABLES

  var observableList = {};
  for(var stateName in defaultVals){
    if(defaultVals.hasOwnProperty(stateName)){
      if(stateName==='evt'){
        throwError('BADNAME', 'evt');
      }
      else{
        observableList[stateName] = new Observable(stateName, defaultVals[stateName], observableList);
      }
    }
  }

  // ROOT INTERFACE

  var out = function(name){
    var observable = observableList[name];
    if(observable===undefined){
      throwError('UNFOUNDSTATE', name);
    }
    else{
      return observable;
    }
  };

  return out;
};

"use strict";
const CryptoJS = require("crypto-js");
var AppConstants = require('../constants/AppConstants');
var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var levelSequences = require('../../levels').levelSequences;
var sequenceInfo = require('../../levels').sequenceInfo;
var util = require('../util');

var ActionTypes = AppConstants.ActionTypes;
var SOLVED_MAP_STORAGE_KEY = 'solvedMap';
var ALIAS_STORAGE_KEY = 'aliasMap';

var _levelMap = {};
var _solvedMap = {};
var _sequences = [];

if (!util.isBrowser()) {
  // https://stackoverflow.com/a/26177872/6250402
  var storage = {};
  var localStorage = {
    setItem: function(key, value) {
      storage[key] = value || '';
    },
    getItem: function(key) {
      return key in storage ? storage[key] : null;
    },
    removeItem: function(key) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function(i) {
      const keys = Object.keys(storage);
      return keys[i] || null;
    }
  };
} else {
  var localStorage = window.localStorage;
}

try {
  _solvedMap = JSON.parse(
    localStorage.getItem(SOLVED_MAP_STORAGE_KEY) || '{}'
  ) || {};
} catch (e) {
  console.warn('local storage failed', e);
}

function encryptMapToURL(map) {
  // const jsonString = JSON.stringify(map);
  // const encrypted = CryptoJS.AES.encrypt(jsonString, "YourSecretKey").toString();
  const encoded = encodeURIComponent(map);
  window.location.hash = `hash=${encoded}`;
}


function decryptMapFromURL() {
  const urlHash = window.location.hash.substr(1);
  const params = new URLSearchParams(urlHash);
  const encrypted = params.get("hash");
  // alert(encrypted);
  if (!encrypted) return null;

  const decoded = decodeURIComponent(encrypted);
  const decrypted = CryptoJS.AES.decrypt(decoded, "selab").toString(CryptoJS.enc.Utf8);
  // var levels_decrypted = decrypted.split("-");
  var levels_arr = new Array();
  // levels_arr = decrypted.split(',');
  // var removed = levels_decrypted.splice(0,1)
  var removed = decrypted.substring(decrypted.indexOf("-") + 1);
  // alert(decrypted.split("-").splice(0,1));
  levels_arr = removed.split(',');
  // alert(levels_decrypted);
  var obj = {};
  for(var i = 0; i < levels_arr.length; i++){
        _solvedMap[levels_arr[i]] = true;
        // alert(JSON.stringify(obj));
        // localStorage.setItem(SOLVED_MAP_STORAGE_KEY, JSON.stringify(obj));
        obj = {}
    }
  // encryptMapToURL(encrypted);
  // localStorage.setItem(SOLVED_MAP_STORAGE_KEY, obj);
  // return JSON.parse(decrypted);
  localStorage.setItem(SOLVED_MAP_STORAGE_KEY, JSON.stringify(_solvedMap));
}

function _syncToStorage() {
  try {
    // decryptMapFromURL();
    localStorage.setItem(SOLVED_MAP_STORAGE_KEY, JSON.stringify(_solvedMap));
    // var aes = require('js-crypto-aes');
    var sid = 0;
    // alert(Object.keys(_solvedMap).length);
    // alert(SOLVED_MAP_STORAGE_KEY.length);
    // var sid = prompt("Enter you student id(학번):");
    // var encrypted = CryptoJS.AES.encrypt(sid, "Secret Passphrase");
    // var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
    // var actual_str = decrypted.toString(CryptoJS.enc.Utf8);
    // alert(encrypted);
    // alert(decrypted);
    // alert(actual_str);
    if (Object.keys(_solvedMap).length == 1) {
      // alert(Object.keys(_solvedMap).length);
      sid = prompt("Enter you student id(학번):");
      // var encrypted = CryptoJS.AES.encrypt(sid, "selab");
      // alert(encrypted);
      localStorage.setItem("SID", sid);
    } 
    if (Object.keys(_solvedMap).length == 2) {
      // alert(Object.keys(_solvedMap).length);
      sid = prompt("Enter you student id(학번):");
      // var encrypted = CryptoJS.AES.encrypt(sid, "selab");
      // alert(encrypted);
      localStorage.setItem("SID", sid);
    } 
    // encodeURIComponent(sid)

    // localStorage.setItem(SOLVED_MAP_STORAGE_KEY, JSON.stringify(_solvedMap));

    if (Object.keys(_solvedMap).length >= 0) {
      var id = localStorage.getItem("SID")
      // alert(Object.keys(_solvedMap).length);
      // alert(id + Object.keys(_solvedMap));
      // var sid = prompt("Enter you student id(학번):");
      var encrypted = CryptoJS.AES.encrypt(id + "-"+ Object.keys(_solvedMap), "selab");
      // alert(encrypted);
      encryptMapToURL(encrypted);
      decryptMapFromURL();
    } else {
      // decryptMapFromURL();
      ;
    }
  } catch (e) {
    console.warn('local storage failed on set', e);
  }
}

function getAliasMap() {
  try {
    return JSON.parse(localStorage.getItem(ALIAS_STORAGE_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function addToAliasMap(alias, expansion) {
  const aliasMap = getAliasMap();
  aliasMap[alias] = expansion;
  localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliasMap));
}

function removeFromAliasMap(alias) {
  const aliasMap = getAliasMap();
  delete aliasMap[alias];
  localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliasMap));
}

var validateLevel = function(level) {
  level = level || {};
  var requiredFields = [
    'name',
    'goalTreeString',
    //'description',
    'solutionCommand'
  ];

  requiredFields.forEach(function(field) {
    if (level[field] === undefined) {
      console.log(level);
      throw new Error('I need this field for a level: ' + field);
    }
  });
};

/**
 * Unpack the level sequences.
 */
Object.keys(levelSequences).forEach(function(levelSequenceName) {
  var levels = levelSequences[levelSequenceName];
  _sequences.push(levelSequenceName);
  if (!levels || !levels.length) {
    throw new Error('no empty sequences allowed');
  }

  // for this particular sequence...
  levels.forEach(function(level, index) {
    validateLevel(level);

    var id = levelSequenceName + String(index + 1);
    var compiledLevel = Object.assign(
      {},
      level,
      {
        index: index,
        id: id,
        sequenceName: levelSequenceName
      }
    );

    // update our internal data
    _levelMap[id] = compiledLevel;
    levelSequences[levelSequenceName][index] = compiledLevel;
  });
});

var LevelStore = Object.assign(
{},
EventEmitter.prototype,
AppConstants.StoreSubscribePrototype,
{
  getAliasMap: getAliasMap,
  addToAliasMap: addToAliasMap,
  removeFromAliasMap: removeFromAliasMap,

  getSequenceToLevels: function() {
    return levelSequences;
  },

  getSequences: function() {
    return Object.keys(levelSequences);
  },

  getLevelsInSequence: function(sequenceName) {
    if (!levelSequences[sequenceName]) {
      throw new Error('that sequence name ' + sequenceName + ' does not exist');
    }
    return levelSequences[sequenceName];
  },

  getSequenceInfo: function(sequenceName) {
    return sequenceInfo[sequenceName];
  },

  getLevel: function(id) {
    return _levelMap[id];
  },

  getNextLevel: function(id) {
    if (!_levelMap[id]) {
      console.warn('that level doesn\'t exist!!!');
      return null;
    }

    // meh, this method could be better. It's a trade-off between
    // having the sequence structure be really simple JSON
    // and having no connectivity information between levels, which means
    // you have to build that up yourself on every query
    var level = _levelMap[id];
    var sequenceName = level.sequenceName;
    var sequence = levelSequences[sequenceName];

    var nextIndex = level.index + 1;
    if (nextIndex < sequence.length) {
      return sequence[nextIndex];
    }

    var nextSequenceIndex = _sequences.indexOf(sequenceName) + 1;
    if (nextSequenceIndex < _sequences.length) {
      var nextSequenceName = _sequences[nextSequenceIndex];
      return levelSequences[nextSequenceName][0];
    }

    // they finished the last level!
    return null;
  },

  isLevelSolved: function(levelID) {
    if (!_levelMap[levelID]) {
      throw new Error('that level doesn\'t exist!');
    }
    return !!_solvedMap[levelID];
  },

  dispatchToken: AppDispatcher.register(function(payload) {
    var action = payload.action;
    var shouldInform = false;

    switch (action.type) {
      case ActionTypes.RESET_LEVELS_SOLVED:
        _solvedMap = {};
        decryptMapFromURL();
        _syncToStorage();
        shouldInform = true;
        
        break;
      case ActionTypes.SET_LEVEL_SOLVED:
        _solvedMap[action.levelID] = true;
        decryptMapFromURL();
        _syncToStorage();
        shouldInform = true;
        
        break;
    }

    if (shouldInform) {
      LevelStore.emit(AppConstants.CHANGE_EVENT);
    }
  })

});

module.exports = LevelStore;

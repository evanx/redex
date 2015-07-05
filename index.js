
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

require('babel/register')({stage: 0});
Object.assign(global, require('./util/Utils'));
global.Redis = require('./util/Redis');
global.RedexGlobal = require('./lib/RedexGlobal');
require('./lib/RedexStart');


import assert from 'assert';

function getMessage(millis, message) {
  return message + ': ' + millis;
}

const factors = {
  ms: 1,
  s: 1000,
  m: 1000*60,
  h: 1000*60*60,
  d: 1000*60*60*24
};

var that = module.exports = {
  format(millis) {
    if (millis < factors.s) {
      return '' + millis + 'ms';
    } else if (millis < factors.m) {
      return '' + parseInt(millis/factors.s) + 's';
    } else if (millis < factors.h) {
      return '' + parseInt(millis/factors.m) + 'm';
    } else if (millis < factors.d) {
      return '' + parseInt(millis/factors.h) + 'h';
    } else {
      return '' + parseInt(millis/factors.d) + 'd';
    }
  },
  parse(millis, defaultValue) {
    let match = millis.match(/^([0-9]+)([a-z]*)$/);
    if (match.length === 3) {
      assert(factors[match[2]], 'factor: ' + match[2]);
      let value = parseInt(match[1]);
      let factor = factors[match[2]];
      return value * factor;
    }
    return defaultValue;
  },
  assert(millis, message) {
    message = message + ': ' + millis;
    assert(millis, message);
    let value = that.parse(millis, -1);
    assert(value >= 0, message + ': ' + value);
    return value;
  }
}


const Errors = {
   decorate(error) {
      if (error.name === 'YAMLException') {
         let err = Object.assign({file}, {name: error.name, reason: error.reason});
         if (error.mark) {
            Object.keys(error.mark).filter(
               name => name !== 'buffer'
            ).forEach(name => {
               err[name] = error.mark[name];
            });
         }
         return err;
      } else {
         return error;
      }
   },
   log(logger, error) {
      if (error.name === 'AssertionErrorX') {
         logger.error('Assertion: ' + error.message);
      } else {
         logger.error('start', error);
         if (error.stack) {
            console.error(error.stack);
         }
      }
   }
};

module.exports = Errors;

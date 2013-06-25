var express             = require ('express');
var fs                  = require ('fs');
var http                = require ('http');
var path                = require ('path');
var gearman_status      = require ('node_gearman_status');
var nconf               = require ('nconf');
var fs                  = require('fs');

//configuration
var confFile;

/*Setup nconf to use (in-order):
     1. Command-line arguments
     2. Environment variables
     3. A file */

   nconf.argv({
      "p": {
         alias: 'http_port',
         describe: 'Http port',
         demand: false,
      
      },
      "sp": {
         alias: 'gearman_server_port',
         describe: 'Gearman server port',
         demand: false,
       
      },
      "sa": {
         alias: 'gearman_server_address',
         describe: 'Gearman server address',
         demand: false,
       
      },
      "s": {
         alias: 'buffer_size',
         describe: 'Buffer size',
         demand: false,
      
      },
      "int": {
         alias: 'interval_polling',
         describe: 'Interval to polling',
         demand: false,
      
      }, 
      "c": {
         alias: 'config',
         describe: 'Path to configuration file',
         demand: false
      }
   });
   
   nconf.env();

   if (nconf.get('c')) {
      confFile = nconf.get('c');
      nconf.file ({ file: confFile })
      console.log ("[configuration]: argv = %j", nconf.get('c'));
      console.log ('[configuration]: Using configuration file: ' + confFile);
      console.log ('[configuration]: ' + nconf.get ('DESCRIPTION'));
      nconf.file ({ file: confFile })
   }else {
      nconf.file ({ file: './configuration/configuration_default.conf' })
   }





var status= new gearman_status(nconf.get('gearman_server_port'), nconf.get('gearman_server_address'), nconf.get('buffer_size'),       nconf.get('interval_polling'));

status.initHistory ();// init the events

var app = express();

app.configure(function () {
  app.set ('port', nconf.get('http_port'));
  app.set ('views', __dirname+'/views');
  app.set ('view engine', 'ejs');
  app.use (express.static(path.join(__dirname, 'public')));
});


app.get ('/', function (req, res) {

   if (status.error!=null) {
      res.render ('gearman_status_graphs', {error: status.error});
   }
   
   history = status.writeHistory();
   
   if (history.length==0){
       res.render ('gearman_status_graphs', {error:"There isn't worker initiated."});
   }

  else {    
      var number_functions=history.length;
         
      history_dates_function= [];
      history_function_wait= [];
      history_function_running= [];
      history_function_capables= [];
      history_names= [];
      
      for (i=0; i <history.length; i++) {         //save all dates of each function
         history_dates= [];
         history_wait= [];
         history_running= [];
         history_capables= [];
         for (j=0; j<history[i].data.length; j++){
            history_dates.push             (history[i].data[j].timestamp.toLocaleTimeString());          
            history_wait.push     (history[i].data[j].waiting);  //waiting_jobs for each date
            history_running.push  (history[i].data[j].running);  //running_jobs for each date
            history_capables.push (history[i].data[j].capables);  //capable_workers for each date
         }
         history_dates_function.push(history_dates);
         history_function_wait.push(history_wait);
         history_function_running.push(history_running);
         history_function_capables.push(history_capables);

      }
      
      for (i=0; i< history.length; i++) {      //get worker's name   
         history_names.push(history[i].name);
      }

      //we return the data to create the graph
      res.render ('gearman_status_graphs', {    names:                JSON.stringify(history_names), 
                                                dates:                JSON.stringify(history_dates_function), 
                                                number_functions:       number_functions, 
                                                history_data_wait:    JSON.stringify(history_function_wait), 
                                                history_data_running: JSON.stringify(history_function_running), 
                                                history_data_capable: JSON.stringify(history_function_capables), 
                                                number_dates:         history_dates.length, 
                                                error:                1});
      
    }   
});

http.createServer (app).listen ((nconf.get('http_port')), function(){
  console.log ("[gearman_status]: HTTP server listening on port " + nconf.get('http_port'));

});


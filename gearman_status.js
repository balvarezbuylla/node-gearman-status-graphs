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
      //   default: 8000
      },
      "sp": {
         alias: 'gearman_server_port',
         describe: 'Gearman server port',
         demand: false,
        // default: 4730
      },
      "sa": {
         alias: 'gearman_server_address',
         describe: 'Gearman server address',
         demand: false,
       //  default: "127.0.0.1"
      },
      "s": {
         alias: 'buffer_size',
         describe: 'Buffer size',
         demand: false,
         //default: 10
      },
      "int": {
         alias: 'interval_polling',
         describe: 'Interval to polling',
         demand: false,
         //default: 1000               //ms
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

  history = status.writeHistory();
   
  if (history.length==0) {              // when data is empty
     res.render ('gearman_status_graphs', {error:"There is not enough data to display a graph"});
  }
  else {
  
    var number_workers=history[0].length;
       
    history_dates= [];
    history_workers_wait= [];
    history_workers_running= [];
    history_workers_capables= [];
    history_names= [];
    
    for (i=0; i <history.length; i++) {         //save all dates
      history_dates.push (history[i][0].date);
    }
    
    for (i=0; i< history[0].length; i++) {      //get worker's name   
      history_names.push(history[0][i].name);
    }
    
    /*format array produced: for each date has every worker together
    for example: history_workers_wait [0,0,0,0] -> the first two numbers are worker 1 and worker 2 at the first date and the second two number are worker 1 and worker 2 at the second date
   */

    for (i=0; i< history.length; i++) {        //for each date
      for (j=0; j<history[i].length; j++){     //for each worker
        history_workers_wait.push     (history[i][j].workers[0]);  //waiting_jobs for each date
        history_workers_running.push  (history[i][j].workers[1]);  //running_jobs for each date
        history_workers_capables.push (history[i][j].workers[2]);  //capable_workers for each date
      }
      
    }
    
    //parse dates: we return hour, min and second
    var hour;
    var min;
    var sec;
    var dates_parsed= [];
    
    for (i=0; i < history_dates.length; i++) {
      hour=history_dates[i].getHours();
      min=history_dates[i].getMinutes();
      sec=history_dates[i].getSeconds();
      if (i!=0){
         if (history_dates[i-1].getHours()!=hour)
           dates_parsed.push(hour+':'+min+':'+sec);
         else dates_parsed.push('');  
      }else{
         dates_parsed.push(hour+':'+min+':'+sec);
      }   
    }

    //we return the data to create the graph
    res.render ('gearman_status_graphs', {     names:                JSON.stringify(history_names), 
                                               dates:                JSON.stringify(dates_parsed), 
                                               number_workers:       number_workers, 
                                               history_data_wait:    JSON.stringify(history_workers_wait), 
                                               history_data_running: JSON.stringify(history_workers_running), 
                                               history_data_capable: JSON.stringify(history_workers_capables), 
                                               number_dates:         history_dates.length, 
                                               error:                1});
  }
});

http.createServer (app).listen ((nconf.get('http_port')), function(){
  console.log ("[gearman_status]: HTTP server listening on port " + nconf.get('http_port'));
});


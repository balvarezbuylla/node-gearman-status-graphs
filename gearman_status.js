var express             = require ('express');
var fs                  = require ('fs');
var http                = require ('http');
var path                = require ('path');
var gearman_status      = require ('node_gearman_status');
var nconf               = require ('nconf');
var fs                  = require('fs');
var RRD                 = require('./node_modules/node_gearman_status/node_modules/rrd').RRD;

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
      nconf.file ({ file: './etc/gearman_status.conf' })
   }





var status= new gearman_status(nconf.get('gearman_server_port'), nconf.get('gearman_server_address'), nconf.get('buffer_size'),       nconf.get('interval_polling'));

status.initHistory ();// init the events

var app = express();

app.configure(function () {
  app.set ('port', nconf.get('http_port'));
  app.set ('views', __dirname+'/views');
  app.set ('view engine', 'ejs');
  app.use(express.bodyParser());
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
      history_max_capables= []; //one for each function
      history_max_running= [];
      history_max_waiting= [];
      average_capables= []; //one for each function
      average_running= [];
      average_waiting= [];
      
      history_names= [];
      
      for (i=0; i <history.length; i++) {        
         history_dates= [];
         history_wait= [];
         history_running= [];
         history_capables= [];
         for (j=0; j<history[i].data.length; j++){
            history_dates.push    (history[i].data[j].timestamp.toLocaleTimeString());          
            history_wait.push     (history[i].data[j].waiting);  //waiting_jobs for each date
            history_running.push  (history[i].data[j].running);  //running_jobs for each date
            history_capables.push (history[i].data[j].capables);  //capable_workers for each date
         }
         history_dates_function.push(history_dates);
         history_function_wait.push(history_wait);
         history_function_running.push(history_running);
         history_function_capables.push(history_capables);
         
         history_max_capables.push(history[i].maxCapablesWorkers); 
         history_max_running.push(history[i].maxRunningJobs);
         history_max_waiting.push(history[i].maxWaitingJobs);
         average_capables.push(history[i].average_capable); 
         average_running.push(history[i].average_running);
         average_waiting.push(history[i].average_waiting);

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
                                                max_capables:         history_max_capables, 
                                                max_running:          history_max_running, 
                                                max_waiting:          history_max_waiting, 
                                                average_capables:     average_capables, 
                                                average_running:      average_running, 
                                                average_waiting:      average_waiting, 
                                                error:                1,
                                                parcial:              0
      });
      
    }   
});

app.post ('/', function (req, res) {
   //file which save the data log of each function
   var rrd = new RRD(req.body.nameFunction+'.rrd');
   var date=new Date().getTime();
    if (req.body.prev_next=='0'){  //previous               
      var hour_initial= date+172800000*parseInt(req.body.page);    //172800000 ms = 2 days
      var hour_final= date+172800000*(parseInt(req.body.page)+1);
      //var hour_initial= date+1000000*parseInt(req.body.page);    
      //var hour_final= date+1000000*(parseInt(req.body.page)+1);
   }
   else{  //next    
     var hour_initial= date+172800000*(parseInt(req.body.page)-1);                 
     var hour_final= date+172800000*parseInt(req.body.page);
     //var hour_initial= date+1000000*(parseInt(req.body.page)-1);                 
     //var hour_final= date+1000000*parseInt(req.body.page);
   }
   var date_initial= new Date(hour_initial);
   var date_final= new Date(hour_final);
   console.log("ini", date_initial);
   console.log("fin", date_final);

   //function to show the log between two dates
   rrd.fetch (Math.round(hour_initial / 1000), Math.round(hour_final / 1000), function(err, results) {
      if (err)
            res.render ('gearman_status_graphs', {error:err});
      else{
        //console.log(results); 
         history_dates_function       = [];
         history_function_wait        = [];
         history_function_running     = [];
         history_function_capables    = [];
         max_capables                 = 0; //one for each function
         max_running                  = 0;
         max_waiting                  = 0;
         average_capables             = 0; //one for each function
         average_running              = 0;
         average_waiting              = 0;
         dates                        =[];
         count_valid_data             = 0;
         
         //transform the data to show the graph
         for (i=0; i<results.length; i++){
            if (results[i].waiting_jobs!="-nan"){
               count_valid_data++;           
               history_function_wait.push(parseInt(results[i].waiting_jobs));
               history_function_capables.push(parseInt(results[i].capable_workers));
               history_function_running.push(parseInt(results[i].running_jobs));
               var date= new Date(parseInt(results[i].timestamp*1000)).toLocaleTimeString();
               dates.push(date);

              //max
               if (max_capables<parseInt(results[i].capable_workers)) 
                  max_capables=parseInt(results[i].capable_workers); 
               if (max_running<parseInt(results[i].running_jobs))
                  max_running=parseInt(results[i].running_jobs);
               if (max_waiting<parseInt(results[i].waiting_jobs))
                  max_waiting=parseInt(results[i].waiting_jobs);
               
               //average
               average_capables=average_capables+parseInt(results[i].capable_workers);
               average_running=average_running+parseInt(results[i].running_jobs);
               average_waiting=average_waiting+parseInt(results[i].waiting_jobs); 
            }    
         }
         
         //average
         average_capables=average_capables/count_valid_data;
         average_running=average_running/count_valid_data;
         average_waiting=average_waiting/count_valid_data;
         
         if (history_function_capables.length==0) 
             res.json({error:"There aren't data for this interval of time"});
         else
            res.json({wait:history_function_wait, capables: history_function_capables, running: history_function_running, date: dates, name:req.body.nameFunction, numberOfFunction:req.body.numberOfFunction, error:0, max_capables:max_capables, max_running: max_running, max_waiting:max_waiting, average_capables: average_capables, average_running: average_running, average_waiting: average_waiting });
      }
   });
});

http.createServer (app).listen ((nconf.get('http_port')), function(){
  console.log ("[gearman_status]: HTTP server listening on port " + nconf.get('http_port'));

});


node-gearman-status-graphs
===================

Node.js module to monitor Gearman server status and show one graph for each worker

With the current values of the configuration: polling every second and every minute you save higher value that it has happened in that minute

  
    USE:
      Yoy must have node.js installed.
      Install dependent packages with: npm install -d
      If you want, change configuration values at: etc/gearman_status.conf. Also, you can define your values by command line.
      In case that the user don't put the configuration file when he execute the program, the program will get etc/gearman_status.conf
      
      The values at configuration file:  
        "http_port"              : used port
        "gearman_server_address" : address the server should listen
        "gearman_server_port"    : port the server should listen
        "buffer_size"            : size of the circular buffer of each function
        "interval_polling"       : milinseconds between polling and polling
        
      To execute the program: node gearman_status.js -c gearman_status.conf or node gearman_status.js  
    
      To run as a service:
        ./install_ubuntu.sh
        stop gearman_status
        start gearman_status
        
  
  

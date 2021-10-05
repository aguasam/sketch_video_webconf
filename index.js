var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

//crio um servidor usando o node
var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8082);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  //funcao para mandar uma mensagem do servidor p/ o cliente
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    //manda a mensagem para todos os clientes do servidor -> broadcasting
    socket.broadcast.emit('message', message);
  });

  //evento para criar sala que é solicitada pelo cliente
  //para o servidor .emit -> .on
  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    //ele verifica quantos clientes existem na sala
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    //manda a mensagem p/ o log informando isso
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    //agr ele analisa quando n tem cliente
    if (numClients === 0) {
      //faz o usuario entrar na sala
      socket.join(room);
      //cria um id pra ele e compartilha no log
      log('Client ID ' + socket.id + ' created room ' + room);
      //o servidor emite que a sala foi criada e o id do cliete
      socket.emit('created', room, socket.id);

      //caso a sala tenha um participante
      //entao ja existe sala
    } else if (numClients === 1) {
      //manda no log que o id do novo cliente
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      //add o cliente na sala
      socket.join(room);
      //emite que o cliente entrou na sala
      socket.emit('joined', room, socket.id);
      //fala que o cliente ja esta pronto pra conexao
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      //caso ja tenha dois participantes
      //n entra na sala
      //so manda a msg que a sala ta cheia
      socket.emit('full', room);
    }
  });

  //DUVIDA
  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});

const mongoose = require("mongoose");
const client = require("socket.io").listen(4000).sockets;

//Connect to mongo
mongoose
  .connect(
    "mongodb+srv://jeejo13:jeejo123@cluster0-q3jj1.mongodb.net/socket-chat?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, db) => {
      if (err) {
        throw err;
      }
      console.log("MongoDB conencted..");

      //Connect to Socket.io
      client.on("connection", (socket) => {
        let chat = new mongoose.model("chats", {
          name: String,
          message: String,
        });
        //Create a function to send status
        const sendStatus = (s) => {
          socket.emit("status", s);
        };

        //Get chats from db

        chat
          .find({})
          .then((res) => {
            //Emit the messages
            socket.emit("output", res);
          })
          .catch((err) => {
            throw err;
          });

        //Handle input events
        socket.on("input", (data) => {
          let name = data.name;
          let message = data.message;

          //Check for name and the message
          if (name == "" || message == "") {
            //Send error status

            sendStatus("Please enter a name and message");
          } else {
            //Insert message
            chat
              .create({ name: name, message: message })
              .then((data) => {
                client.emit("output", [data]);

                //Send status object
                sendStatus({
                  message: "Message sent",
                  clear: true,
                });
              })
              .catch((err) => {
                throw err;
              });
          }
        });
        //Handle Clear
        socket.on("clear", (data) => {
          //Remove all chats
          chat
            .remove({})
            .then(() => {
              // Emit cleared
              socket.emit("cleared");
            })
            .catch((err) => {
              throw err;
            });
        });
      });
    }
  )
  .catch((err) => {
    throw err;
  });

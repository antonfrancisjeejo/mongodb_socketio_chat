const mongoose = require("mongoose");
const socketio = require("socket.io");
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const cors = require("cors");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const client = socketio(server);
const roomSchema = new mongoose.Schema({
  roomName: String,
  img: String,
});

let tempRoom = new mongoose.model("rooms", roomSchema);
app.get("/", (req, res) => {
  tempRoom.aggregate([{ $sample: { size: 12 } }]).then((result) => {
    return res.status(200).send(result);
  });
});

app.get("/:roomName", (req, res) => {
  tempRoom
    .find({ roomName: req.params.roomName })
    .then((result) => {
      if (result.length > 0) {
        return res.status(200).send({ success: true, data: result[0] });
      } else {
        return res.send({ success: false });
      }
    })
    .catch((err) => {
      return res.status(500).send({ success: false });
    });
});

app.post("/", (req, res) => {
  tempRoom
    .create({ roomName: req.body.roomName, img: req.body.img })
    .then(() => {
      return res.status(200).send({ success: true });
    })
    .catch((err) => {
      return res.status(500).send({ success: false });
    });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server has started.`));

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
      const schema = new mongoose.Schema({
        name: String,
        message: String,
      });
      //Connect to Socket.io
      client.on("connection", (socket) => {
        //Create a function to send status
        tempRoom.aggregate([{ $sample: { size: 9 } }]).then((res) => {
          socket.emit("rooms", res);
        });
        let roomName = Object.values(socket.request._query)[0];
        let roomImg = Object.values(socket.request._query)[1];
        let chat = new mongoose.model(roomName, schema);
        chat
          .find({})
          .limit(50)
          .then((res) => {
            //Emit the messages
            if (res.length > 0) {
              socket.emit("output", res);
            }
          })
          .catch((err) => {
            throw err;
          });

        //Get chats from db

        //Handle input events
        socket.on("input", (data) => {
          let message = data.message;

          //Check for name and the message
          if (message.trim() == "") {
            //Send error status

            return;
          } else {
            //Insert message
            chat
              .create({ message: message })
              .then((data) => {
                client.emit("output", [data]);
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

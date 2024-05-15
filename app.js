const express = require("express");
const { exec, spawn } = require("child_process");
const cors = require("cors");
const bodyParser = require("body-parser");
const { writeFile, unlink } = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/", async (req, res) => {
  const code = req.body.code;
  const inputs = req.body.Parameters;

  const fileName = uuidv4();

  await writeFile(`./${fileName}.c`, code);

  exec(
    `gcc ./${fileName}.c -o ./${fileName}`,
    async (error, stdout, stderr) => {
      await unlink(`./${fileName}.c`);

      if (error || stderr) {
        return res.status(200).send({
          responseCode: 301,
          output: null,
          errorMessage: error || stderr,
        });
      }

      const childProcess = exec(
        `${fileName}.exe`,
        async (error, stdout, stderr) => {
          await unlink(`./${fileName}.exe`);

          if (error || stderr) {
            return res.status(200).send({
              responseCode: 301,
              output: null,
              errorMessage: error || stderr,
            });
          }

          res.status(200).send({
            responseCode: 201,
            output: stdout,
            errorMessage: null,
          });
        }
      );

      inputs.forEach((input) => childProcess.stdin.write(`${input}\n`));

      childProcess.stdin.end();
    }
  );
});

app.listen(8080, () => console.log("Server is running on port 8080"));

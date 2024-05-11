const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const bodyParser = require("body-parser");
const { writeFile, unlink } = require("fs").promises; // Import unlink function
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/", async (req, res) => {
  const code = req.body.code;
  const args = req.body.Parameters.join(" ");

  const fileName = uuidv4(); // Remove await, as uuidv4 does not return a promise

  if (code.includes("#include <stdlib.h>") || code.includes("system(")) {
    return res.status(301).send({
      responseCode: 301,
      output: null,
      errorMessage: "Couldn't compile code.",
    });
  }

  try {
    await writeFile(`./${fileName}.c`, code); // Use await to ensure file is written before proceeding

    exec(
      `gcc ./${fileName}.c -o ./${fileName}`,
      async (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          console.error("Compilation error:", compileStderr);
          await unlink(`./${fileName}.c`); // Delete the C file if compilation fails
          return res.status(500).send({
            responseCode: 301,
            output: null,
            errorMessage: compileStderr,
          });
        }

        exec(
          `./${fileName} ${args}`,
          async (runError, runStdout, runStderr) => {
            await unlink(`./${fileName}.c`); // Delete the C file after execution
            await unlink(`./${fileName}`); // Delete the executable file after execution

            if (runError) {
              console.error("Execution error:", runStderr);
              return res.status(500).send({
                responseCode: 301,
                output: null,
                errorMessage: runStderr,
              });
            }

            console.log("Execution successful:", runStdout);
            res.status(200).send({
              responseCode: 201,
              output: runStdout,
              errorMessage: null,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error writing file:", error);
    res.status(500).send({
      responseCode: 301,
      output: null,
      errorMessage: error.toString(),
    });
  }
});

app.listen(8080, () => console.log("Server is running on port 8080"));

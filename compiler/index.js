const { writeFile, unlink } = require("fs").promises;
const { exec } = require("child_process");

process.stdin.setEncoding("utf8");

let code = "";
let fileName = "main";
let inputs = [];
let rawData = "";

process.stdin.on("data", (chunk) => {
  rawData += chunk;
});

process.stdin.on("end", () => {
  const parsedData = JSON.parse(rawData);

  code = parsedData.code.trim();
  inputs = parsedData.input;

  processCode(code, (data) => {
    console.log(data);
  });
});

async function processCode(code, callback) {
  try {
    await writeFile(`./${fileName}.c`, code);

    exec(
      `gcc ./${fileName}.c -o ./${fileName}`,
      async (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          await cleanup();
          callback({
            responseCode: 301,
            output: null,
            errorMessage: compileStderr,
          });
          return;
        }

        const childProcess = exec(
          `./${fileName}`,
          async (runError, runStdout, runStderr) => {
            await cleanup();
            if (runError) {
              callback({
                responseCode: 301,
                output: null,
                errorMessage: runStderr,
              });
              return;
            }

            if (runStdout)
              callback({
                responseCode: 201,
                output: runStdout,
                errorMessage: null,
              });
          }
        );

        inputs.forEach((input) => childProcess.stdin.write(`${input}\n`));

        childProcess.stdin.on("error", (error) => {
          if (error.code !== "EPIPE") {
            console.error("Error writing input to child process:", error);
          }
        });

        childProcess.stdin.end();
      }
    );
  } catch (error) {
    console.error("Error writing file:", error);
    callback({
      responseCode: 301,
      output: null,
      errorMessage: error.toString(),
    });
  }
}

async function cleanup() {
  try {
    await unlink(`./${fileName}.c`);
    await unlink(`./${fileName}`);
  } catch (error) {
    console.error("Error cleaning up files:", error);
  }
}

process.stdin.resume();

const { writeFile, unlink } = require("fs").promises;
const { spawn } = require("child_process");

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

  processCode(code, inputs, (data) => {
    console.log(data);
  });
});

async function processCode(code, inputs, callback) {
  try {
    await writeFile(`./${fileName}.c`, code);

    const compileProcess = spawn("gcc", [
      `./${fileName}.c`,
      "-o",
      `./${fileName}`,
    ]);

    compileProcess.on("error", (error) => {
      console.error("Compilation error:", error);
      callback({
        responseCode: 301,
        output: null,
        errorMessage: error.toString(),
      });
    });

    compileProcess.on("close", async (code) => {
      if (code !== 0) {
        console.error("Compilation failed with code:", code);
        await cleanup();
        callback({
          responseCode: 301,
          output: null,
          errorMessage: `Compilation failed with code ${code}`,
        });
        return;
      }

      const childProcess = spawn(`./${fileName}`);
      let output = "";
      let errorOccurred = false;

      const timeout = setTimeout(() => {
        childProcess.kill();
        errorOccurred = true;
        callback({
          responseCode: 301,
          output: null,
          errorMessage: {
            error: "Timeout Error",
            message: "Execution timed out.",
          },
        });
      }, 10000); // 10 seconds timeout

      childProcess.on("error", (error) => {
        console.error("Execution error:", error);
        clearTimeout(timeout);
        callback({
          responseCode: 301,
          output: null,
          errorMessage: error.toString(),
        });
      });

      childProcess.stdout.on("data", (data) => {
        output += data.toString();
        if (output.length > 1e6) {
          // 1MB limit
          clearTimeout(timeout);
          childProcess.kill();
          errorOccurred = true;
          callback({
            responseCode: 301,
            output: null,
            errorMessage: {
              error: "Output Limit Exceeded",
              message: "The output is too large.",
            },
          });
        }
      });

      childProcess.stderr.on("data", (data) => {
        console.error(`Execution error: ${data}`);
        clearTimeout(timeout);
        errorOccurred = true;
        callback({
          responseCode: 301,
          output: null,
          errorMessage: data.toString(),
        });
      });

      childProcess.on("close", async () => {
        clearTimeout(timeout);
        if (!errorOccurred) {
          await cleanup();
          callback({
            responseCode: 201,
            output: output.trim(),
            errorMessage: null,
          });
        }
      });

      inputs.forEach((input) => {
        childProcess.stdin.write(`${input}\n`);
      });

      childProcess.stdin.end();
    });
  } catch (error) {
    console.error("Error processing code:", error);
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

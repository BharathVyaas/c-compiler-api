const express = require("express");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());

app.post("/", (req, res) => {
  try {
    const code = req.body.code;
    const args = req.body.args;

    // Spawn a Docker run process and pass code as input
    const dockerRun = spawn(
      "docker",
      ["run", "--rm", "-i", "bharathvyaas/compiler"],
      {
        stdio: "pipe",
      }
    );

    // Write the code to the stdin of the Docker run process
    dockerRun.stdin.write(JSON.stringify({ code, input: args }));
    dockerRun.stdin.end(); // End the input stream

    // Capture output from the Docker run process
    let output = "";
    let errorOccurred = false;
    let errorMessage = "";

    dockerRun.stdout.on("data", (data) => {
      output += data.toString();
      if (output.length > 1e6) {
        // 1MB limit
        dockerRun.kill();
        errorOccurred = true;
        errorMessage = {
          responseCode: 301,
          output: null,
          errorMessage: {
            error: "Output Limit Exceeded",
            message: "The output is too large.",
          },
        };
      }
    });

    dockerRun.stderr.on("data", (data) => {
      console.error(`Error: ${data}`);
      errorOccurred = true;
      if (data.includes("RangeError")) {
        errorMessage = {
          responseCode: 301,
          output: null,
          errorMessage: {
            error: "Range Error",
            message: "Program taking too much memory.",
          },
        };
      } else {
        errorMessage = {
          responseCode: 301,
          output: null,
          errorMessage: {
            error: "Error Executing",
            message: "Something went wrong while executing the code.",
          },
        };
      }
    });

    dockerRun.on("close", (code) => {
      console.log(`Child process exited with code ${code}`);
      if (errorOccurred) {
        res.status(200).send(errorMessage);
      } else {
        res.send({
          responseCode: 200,
          output: output,
          errorMessage: null,
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({
      responseCode: 500,
      output: null,
      errorMessage: {
        error: "Internal Server Error",
        message: error.message,
      },
    });
  }
});

// Start the API server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

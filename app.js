const express = require("express");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");

const app = express();

// Middleware to parse JSON body
app.use(bodyParser.json());

// Endpoint to receive code from the frontend
app.post("/execute", (req, res) => {
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
    dockerRun.stdin.write(JSON.stringify({ code, args: args.join(" ") }));
    dockerRun.stdin.end(); // End the input stream

    // Capture output from the Docker run process
    let output = "";
    dockerRun.stdout.on("data", (data) => {
      output += data.toString();
    });

    dockerRun.stderr.on("data", (data) => {
      console.error(`Error: ${data}`);
    });

    dockerRun.on("close", (code) => {
      console.log(`Child process exited with code ${code}`);
      res.send({ output });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the API server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

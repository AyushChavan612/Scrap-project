const mongoose = require("mongoose"); 
require('dotenv').config();
const express = require("express"); 
const session = require("express-session");
const path = require("path"); 
const app = express();

const User = require("./models/user.js");
const Scrap = require("./models/scrap.js");
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
const port = process.env.PORT;

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; font-src 'self' data: https://scrap-project-five.vercel.app"
  );
  next();
});

main()
  .then((res) => {
    console.log("Connection Successfull");
  })
  .catch((err) => console.log(err));

async function main() {
  
  await mongoose.connect(process.env.MONGO_URL);
}

app.listen(port, () => {
  console.log(`the app is listening to the port ${port}`);
});
app.get("/", (req, res) => {
  res.render("index");
});


app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { name, username, email, phone, password, type } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send(`
        <script>
          alert("Username already exists. Please choose a different username.");
          window.location.href = "/signup";
        </script>
      `);
    }

    const newUser = new User({
      name: name,
      username: username,
      email: email,
      phone: phone,
      password: password,
      type: type,
    });


    await newUser.save();

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/user", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    const scrap = await Scrap.findOne({ username: username });
    const scrapCollection = await Scrap.find();
    console.log(scrapCollection);
    if (user && user.password == password) {
      if (user.type == "company") {
        res.render("company", { user, scrapCollection });
      } else if (user.type == "vendor") {
        res.render("vendor", { user, scrap });
      }
    } else {
      res.send(`
            <script>
              alert("Incorrect username or  password");
              window.location.href = "/login";
            </script>
          `);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(`
          <script>
            alert("Internal Server Error");
            window.location.href = "/login"; 
          </script>
        `);
  }
});
app.post("/addScrap", async (req, res) => {
  try {
    const { name, username, price, quantity, city, locality, type } = req.body;

    const existingUser = await Scrap.findOne({ username });

    if (existingUser) {
      existingUser.scrap.push({
        name,
        price,
        quantity,
        city,
        locality,
        type,
      });
      await existingUser.save();
    } else {

      const newScrap = new Scrap({
        username: username,
        scrap: [
          {
            name,
            price,
            quantity,
            city,
            locality,
            type,
          },
        ],
      });
      await newScrap.save();
    }

    res.redirect(`/user?username=${username}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Define a route handler for "/user"
app.get("/user", async (req, res) => {
  try {
    // Fetch user data based on the username from the query parameters
    const { username } = req.query;
    const user = await User.findOne({ username });
    const scrap = await Scrap.findOne({ username });
    const scrapCollection = await Scrap.find();

    // Render the user page with the retrieved data
    res.render("vendor", { user, scrap, scrapCollection });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// edit route
app.get("/edit", async (req, res) => {
  try {
    const { _id, username, name ,idx } = req.query;
    
    // Fetch the user details by username
    const scraps = await Scrap.findOne({ username });
    const scrap = scraps.scrap[idx];

    if (!scrap) {
      // Handle the case where no matching scrap record is found
      return res.status(404).json({ message: "Scrap record not found." });
    }


    // Render the edit view with the user details
    res.render("edit", { _id, name, username, scrap , idx });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});


app.patch("/edit", async (req, res) => {
  try {
    const { _id, name, username, type, locality, city, price, quantity, idx } = req.body;

    const update = await Scrap.findOneAndUpdate(
      { username },
      {
        $set: {
          [`scrap.${idx}.name`]: name,
          [`scrap.${idx}.type`]: type,
          [`scrap.${idx}.locality`]: locality,
          [`scrap.${idx}.city`]: city,
          [`scrap.${idx}.price`]: price,
          [`scrap.${idx}.quantity`]: quantity,
        },
      },
      { new: true } // Set this option to return the modified document
    );

    if (!update) {
      return res.status(404).json({ message: "Scrap record not found." });
    }

    // Redirect to the user page after successful update
    res.redirect(`/user?username=${username}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});



app.delete("/delete", async (req, res) => {
  try {
    const { id: _id, name, username } = req.body;

    // Delete the specific element from the scrap array by name
    const result = await Scrap.updateOne(
      { "scrap.name": name },
      { $pull: { scrap: { _id: _id } } }
    );

    if (result.modifiedCount === 1) {
      // Element deleted successfully
      res.redirect(`/user?username=${username}`);
    } else {
      // Element not found
      res.status(404).json({ message: "Element not found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});


app.post("/contact", async (req, res) => {
  try {
    const { username, _id } = req.body;
    const user = await User.findOne({ username });
    const scrapCollection = await Scrap.findOne({ username });
    let scrap;
    for( let i = 0 ; i<scrapCollection.scrap.length ; i++){
      if( scrapCollection.scrap[i]._id == _id){
       scrap = scrapCollection.scrap[i];
      }
    }

    res.render("contact", { scrap , scrapCollection , user});
    console.log(scrap);

  } catch (error) {

    console.error("Error in contact route:", error);
    res.status(500).send("Internal Server Error");
  }
});

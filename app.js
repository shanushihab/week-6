const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
require("dotenv").config();
const { ObjectId } = require("mongodb");
const { connectDB, client } = require('./model/mongodb'); // import dbs
const nocache = require('nocache')
const app = express();
const port = process.env.PORT
const {preventSignupCache,userLoginPreventCache,preventAdminCache} = require("./middleware/auth")

app.use(bodyParser.urlencoded({ extended: true }));
app.use(nocache())
// Session middleware setup

app.use(session({
  secret:'week-6-TASK-Anno',
  resave:false,
  saveUninitialized:true,
  cookie:{
      maxAge:100*60*60*24
  }
}))

// Serve static files (optional)
app.use(express.static("public"));

// Set the view engine to EJS
app.set("view engine", "ej");

// Validation function for name, email, and password
function validateSignupInput(name, email, password) {
  const nameregex =/^[a-zA-Z ]{3,}$/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/; // Updated regex

  if (!nameregex.test(name)) {
    return "Name must be at least 3 characters long";
  }
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }
  if (!passwordRegex.test(password)) {
    return "Password must be at least 8 characters long, include one uppercase letter, one number, and one symbol";
  }

  return null; // No error
}


app.get("/", (req, res) => {

  res.redirect('/home');
});

// Home route
app.get('/home',(req,res)=>{
  if (!req.session.user) {
    return res.redirect("/login"); // Redirect to login if not logged in
  }

  res.render("home", { user: req.session.user });
})



// Login route
app.get("/login", preventAdminCache,preventSignupCache,userLoginPreventCache,(req, res) => {
    res.render("login", {
        credentialsMissing: req.session.credentialsMissing,
        invalidCredentials: req.session.invalidCredentials,
      });
      // Clear form state after rendering
      req.session.credentialsMissing = false;
      req.session.invalidCredentials = false;

//  res.render('admin-dashboard');
});
// Signup route
app.get("/signup",preventSignupCache,userLoginPreventCache,preventAdminCache, (req, res) => {
  res.render("signup", {
    signupError: req.session.signupError
  });
  
  req.session.signupError = false;
});
// Login POST request
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // Fetch user from database
  const user = await client
    .db("all_users")
    .collection("Users")
    .findOne({ email });

  if (user && user.password === password) {
    // Set session on successful login
    req.session.user = user;
    // Clear any leftover login error messages
    req.session.credentialsMissing = false;
    req.session.invalidCredentials = false;
    req.session.userLogin = true; // session handling
    return res.redirect("/"); // Redirect to home page
  } else {
    // On failure, set session variables for error messages
    req.session.invalidCredentials = true;
    return res.redirect("/login"); // Redirect back to login
  }
});


// Signup POST request
app.post("/signup",async (req, res) => {
  const { name, email, password } = req.body;
  // Validate input fields
  const error = validateSignupInput(name, email, password);
  if (error) {
    req.session.signupError = error; // Store error message in session
    return res.redirect('/signup'); // Redirect back to signup with error
  }
  try {
    const existingUser = await client
      .db("all_users")
      .collection("Users")
      .findOne({ email });

    if (existingUser) {
      req.session.signupError = "Email ID already exists. Please use a different email.";
      return res.redirect("/signup");
    }
    // Insert new user into database
    await client
      .db("all_users")
      .collection("Users")
      .insertOne({ name, email, password });

    // Set session for new user
    req.session.user = { name, email };
    
    // Clear session data after successful signup
    req.session.signupError = null;
    req.session.signupSucess = true;
    return res.redirect("/"); // Redirect to home after signup
  } catch (err) {
    console.error("Signup error:", err);
    req.session.signupError = "An error occurred during signup.";
    res.redirect("/signup");
  }
});

app.get("/logout", (req, res) => {
  req.session.userLogin = false;
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.clearCookie("connect.sid"); // Clears the session cookie
    res.redirect("/login");
  });
});

app.get("/admin-logout", (req, res) => {
    admindashboard = false;
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out admin");
    }
    res.clearCookie("connect.sid"); // Clears the session cookie
    res.redirect("/admin-login");
  });
});
// Admin login GET route

app.get("/admin-login",preventAdminCache,userLoginPreventCache,preventSignupCache, (req, res) => {
    // Check if the user is already on the admin dashboard
    

    // Render the admin login page if not logged in
    res.render("admin-login", {
        invalidAdminCredentials: req.session.invalidAdminCredentials,
    });

    // Clear the invalid credentials session variable after rendering
    req.session.invalidAdminCredentials = false;
});

app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true; // Set session for admin login
    return res.redirect("/admin-dashboard");
  } else {
    req.session.invalidAdminCredentials = true; // Set error message
    return res.redirect("/admin-login");
  }
});

// Admin dashboard
app.get("/admin-dashboard", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin-login"); // Redirect to admin login if not logged in
  }
 
  const searchQuery = req.query.search || ""; // Get search query from URL, default to an empty string
  const searchFilter = searchQuery
    ? {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive regex search on 'name'
          { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive regex search on 'email'
        ],
      }
    : {}; // If no search query, return all users

  try {
    const users = await client
      .db("all_users")
      .collection("Users")
      .find(searchFilter)
      .toArray();

    // Render admin dashboard with filtered user data and the search query
    res.render("admin-dashboard", { users, searchQuery });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.send("Error fetching users.");
  }
});

// GET route to display the create user form
app.get("/create-user", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin-login"); // Redirect to admin login if not logged in
  }
  res.render("create-user");
});

// POST route to handle creating a new user
app.post("/create-user", async (req, res) => {
  const { name, email, password } = req.body;
  const error = validateSignupInput(name, email, password);

  if (error) {
    return res.send(error); // You can display error in the form
  }

  await client
    .db("all_users")
    .collection("Users")
    .insertOne({ name, email, password });

  res.redirect("/admin-dashboard"); // Redirect back to the dashboard after creating
});

app.get('/edit-user/:id', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin-login"); // Redirect to admin login if not logged in
  }
  try {
    const userId = req.params.id;
    
    // Use MongoDB's native method to find the user by ID
    const user = await client
      .db("all_users")
      .collection("Users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).send('User not found');
    }
    
    res.render('edit-user', { user }); // Pass the user to the view
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


// POST route to handle updating the user
app.post("/edit-user/:id", async (req, res) => {
  const userId = req.params.id;
  let { name, email, password } = req.body;

  // Trim the input values to remove extra spaces
  name = name.trim();
  email = email.trim();
  password = password.trim();

  // Validate that none of the fields are empty after trimming
  if (name === "" || email === "" || password === "") {
    console.log(
      "Name, email, and password cannot be empty or contain only spaces"
    );
    return res.send(
      "Name, email, and password cannot be empty or contain only spaces"
    ); // Return error message to the user
  }

  try {
    await client
      .db("all_users")
      .collection("Users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { name, email, password } }
      );

    res.redirect("/admin-dashboard"); // Redirect to admin dashboard after a successful update
  } catch (error) {
    console.error("Error updating user:", error);
    res.send("Error updating user."); // Handle error case
  }
});

// POST route to delete a user
app.post("/delete-user/:id", async (req, res) => {
  const userId = req.params.id;

  await client
    .db("all_users")
    .collection("Users")
    .deleteOne({ _id: new ObjectId(userId) });
    console.log(userId);
  
  res.redirect("/admin-dashboard");
});


app.get('*', (req, res) => {
  if (req.session.loggedIn) {
      res.redirect('/home'); 
  } else {
      res.redirect('/'); // Redirect to login if not logged in
  }
});
// Error-handling middleware for internal server errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

//database connect first then only connect to PORT
connectDB().then(()=>{
  // Server listener
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

}).catch((err)=>{
  console.log(err);
  
})

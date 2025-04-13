// netlify/functions/api.js
const { formatResponse } = require("./auth-utils");
const registerHandler = require("./register").handler;
const loginHandler = require("./login").handler;
const logoutHandler = require("./logout").handler;
const userHandler = require("./user").handler;

exports.handler = async (event, context) => {
  // Get the endpoint from the path
  const path = event.path.replace('/.netlify/functions/api/', '');
  
  // Route to the appropriate handler based on the path
  switch (path) {
    case 'register':
      return registerHandler(event, context);
    case 'login':
      return loginHandler(event, context);
    case 'logout':
      return logoutHandler(event, context);
    case 'user':
      return userHandler(event, context);
    default:
      return formatResponse(404, { message: "Not found" });
  }
};

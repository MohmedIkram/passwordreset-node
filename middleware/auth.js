import jwt from "jsonwebtoken";

// custom middleware
export const auth = (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    console.log(token);
    jwt.verify(token, "secretkey");
    next(); // OK
  } catch (err) {
    res.status(500);
    console.log(err);
    res.send({ err: err.message });
  }
};

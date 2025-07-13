const jwt = require("jsonwebtoken")


const verifyToken = (req,res,next) => {
  // console.log(req.headers)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
    if(authHeader){
        const token = authHeader.split(" ")[1];
        // console.log("token :: ",token);
        jwt.verify(token , process.env.JWT_SEC , (err,employee) => {
            if(err){
                return res.status(403).json({message: "Token is not valid!" , employee});
            } 
            req.employee = employee;
            next();
        })
    }else{
        return res.status(401).json({message:"You are not authenticated!"})
    }
}


const verifyTokenAndAuth = (req , res ,next) => {
    verifyToken(req,res, ()=> {
        if((req.employee.id === req.params.id) || req.employee.isAdmin){
            next();
        }else{
            res.status(403).json({message:"You are not allowed"})
        }
    })
}

const verifyTokenAndAdmin = (req, res, next) => {
  // console.log("hi2")
    verifyToken(req, res, () => {
      if (req.employee.role === 'admin') {
        next();
      } else {
        res.status(403).json({message:"You are not alowed to do that!"});
      }
    });
  };

  const verifyTokenAndRoles = (roles) => (req, res, next) => {
    // console.log("hi1")
    verifyToken(req, res, () => {
      if (roles.includes(req.employee.role)) {
        next();
      } else {
        res.status(403).json({message:"You are not alowed to do that!"});
      }
    });
  };
module.exports = {
    verifyToken,
    verifyTokenAndAuth,
    verifyTokenAndAdmin,
    verifyTokenAndRoles
};

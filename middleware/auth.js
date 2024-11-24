function preventSignupCache(req, res, next) {
    // Set headers to prevent caching
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  
    if (req.session.signupSucess) {
      return res.redirect("/"); 
    } else {
      return next();
    }
  }

  function userLoginPreventCache(req, res, next) {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  
    if (req.session.userLogin) {
      return res.redirect("/"); 
    } else {
      return next();
    }
  }

  function preventAdminCache(req, res, next) {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  // let a = true;
    if (req.session.admin) {
      return res.redirect("/admin-dashboard"); 
    } else {
      return next();
    }
  }
  

  module.exports = {
    preventSignupCache,
    userLoginPreventCache,
    preventAdminCache
  }
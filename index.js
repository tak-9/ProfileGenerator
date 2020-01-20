const fs = require("fs");
const axios = require("axios");
const inquirer = require("inquirer");
var pdf = require('html-pdf');
var options = { format: 'Letter' };

var generateHTML = require("./generateHTML.js");


//const username = "ceckenrode";
// const username = "tak-9";
//const username = "torvalds";
var username;

var avatar_url;
var name;
var company;
var bio;
var location;
var html_url;
var blog;
var public_repos;
var followers;
var following;
var starredNum;

inquirer
  .prompt({
    message: "Enter your GitHub username",
    name: "username"
  })
  .then(getDataFromWeb);


function getDataFromWeb(ans) { 
    var promiseGetUserInfo = new Promise(function(resolve, reject) {
        console.log("--- promiseGetUserInfo start ---");
        username = ans.username;
        console.log(username);
        const usersUrl = `https://api.github.com/users/${username}`;
        axios.get(usersUrl)
            .then(function (res) {
                //console.log("header",res.headers);
                //console.log(res.data);
                avatar_url = res.data.avatar_url;
                name = res.data.name;
                company = res.data.company;
                location = res.data.location;
                bio = res.data.bio;
                html_url = res.data.html_url;
                blog = res.data.blog;
                public_repos = res.data.public_repos;
                followers = res.data.followers;
                following = res.data.following;
                console.log("--- promiseGetUserInfo end ---");
                resolve();
            })
    });
    
    var promiseGetStarred = new Promise(function(resolve, reject) { 
        console.log("=== promiseGetStarred start ===");
        const starredUrl = `https://api.github.com/users/${username}/starred?per_page=30`;
        axios.get(starredUrl)
        .then(function(res){ 
            // Read this doc. https://developer.github.com/v3/guides/traversing-with-pagination/
            // res.headers.link extracts 'Link' in HTTP response HEADER. 
            // You will get something like this if there are more than 30 (or per_page) entries. (30 is default when per_page paramater is not given.)
            //Link: <https://api.github.com/user/9385814/starred?per_page=30&page=2>; rel="next", <https://api.github.com/user/9385814/starred?per_page=30&page=3>; rel="last"
            const link = res.headers.link;
            //console.log(link);
            if (typeof link!=='undefined'){
                // 'link' exists in header, if there is more than one page
                // Extract the last page number
                let linksplit = link.split(",");
                let lastPageNumTemp = linksplit[1].match(/[&?]page=[0-9]*/g);
                let lastPageNum = lastPageNumTemp[0].match(/[0-9]+/);
                // console.log("lastpageNum: ", lastPageNum[0]);
                let StarredNumInLastPage = 0;
    
                // Get Starred Num from last page.
                const starredLastPageUrl = `https://api.github.com/users/${username}/starred?page=${lastPageNum}&per_page=30`;
                axios.get(starredLastPageUrl)
                .then(function(res) { 
                    StarredNumInLastPage = res.data.length;
                    starredNum = (30 * (lastPageNum - 1)) + StarredNumInLastPage ;
                    console.log("starredNum: "+ starredNum);
                    console.log("=== promiseGetStarred end ===");
                    resolve();
                });
            } else {
                // 'link' does not exist 
                starredNum = res.data.length;
                console.log("starredNum: "+ starredNum);
                console.log("=== promiseGetStarred end ===");
                resolve();
            }
        })
    })

    Promise.all([promiseGetUserInfo, promiseGetStarred]).then(printValues);
}


function printValues(){ 
     const data = {
        color: "pink",
        avatar_url: avatar_url,
        name: name,
        company: company,
        bio: bio,
        location: location,
        html_url: html_url,
        blog: blog,
        public_repos: public_repos,
        followers: followers,
        following: following,
        starredNum: starredNum};
    //console.log(data);
    const HTMLstr = generateHTML.createHTML(data);
    console.log(HTMLstr);

    fs.writeFile("output.html", HTMLstr, function(){
        console.log("Written to output.html");   
    })

    pdf.create(HTMLstr).toFile('./output.pdf', function(err, res) {
        if (err) return console.log(err);
        console.log(res); // { filename: '/app/businesscard.pdf' }
      });

};

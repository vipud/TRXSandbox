import { observable } from "mobx";

//Deals with global variables

class UserStore {
  @observable authed = false;
  @observable email = "";
  @observable displayName = "";
  @observable photoURL = "";
  @observable uid = "";
  @observable role = "";

  //allows users to navigate app
  login() {
    this.authed = true;
  }

  //global user data
  fetchUserInfo(email, displayName, photoURL, uid) {
    this.email = email;
    this.displayName = displayName;
    this.photoURL = photoURL;
    this.uid = uid;
  }

  fetchUserRole(role) {
    this.role = role;
  }

  //resets global variable to ""
  logout() {
    this.authed = false;
    this.email = "";
    this.displayName = "";
    this.photoURL = "";
    this.uid = "";
    this.role = "";
  }
}

const userStore = new UserStore();
export default userStore;

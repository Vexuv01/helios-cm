import * as repository from "../repositories/authRepository";

export async function login(email, password) {
  return repository.signIn(email, password);
}

export async function logout() {
  return repository.signOut();
}

export async function currentSession() {
  return repository.getSession();
}

export function subscribe(callback) {
  return repository.onAuthStateChange(callback);
}

export async function forgotPassword(email) {
  return repository.resetPassword(email);
}

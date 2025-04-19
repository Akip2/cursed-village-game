export async function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export function isRoleWraith(role) {
    return role === "wraith" || role === "judge";
}
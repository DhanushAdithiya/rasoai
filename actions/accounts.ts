import AsyncStorage from "@react-native-async-storage/async-storage";

const server = `http://10.238.248.72:8000/`

// Types for better type safety
interface LoginResponse {
    message: string;
    user: {
        user_id: string;
        username: string;
        preferences?: string;
        diet_plan?: string;
    };
    access_token: string;
}

interface SignupResponse {
    message: string;
    user_id: string;
}

interface ErrorResponse {
    error: string;
}

// Login function
export async function login(email: string, password: string): Promise<LoginResponse | ErrorResponse> {
    console.log("here")
    try {
        console.log("Logging user in...");
        console.log(process.env.EXPO_PUBLIC_SERVER_URL);

        const api = `${server}login/`
        console.log(api)
        
        const response = await fetch(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email, 
                password: password,
            }),
        });

        const data = await response.json();
        console.log(data.user_id)

        if (response.ok && data.access_token) {
            await AsyncStorage.setItem('access_token', data.access_token);
            await AsyncStorage.setItem("user_id", data.user_id);

            return data as LoginResponse;
        } else {
            console.log("Login failed:", data.error || "Unknown error");
            return { error: data.error || "Login failed" };
        }
    } catch (error) {
        console.log("Login error:", error);
        return { error: "Network error occurred during login" };
    }
}

// Signup function
// Updated interface for signup data
interface SignupData {
  name: string;
  email: string;
  password: string;
  preferences?: string;
  height: number;
  weight: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export async function signup(signupData: SignupData): Promise<SignupResponse | ErrorResponse> {
    try {
        console.log("Creating new user account...");
        
        const api = `${server}signup/`
        console.log(api)
        const response = await fetch(api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: signupData.name,
                email: signupData.email,
                password: signupData.password,
                preferences: signupData.preferences || null,
                // Personal information
                height: signupData.height,
                weight: signupData.weight,
                age: signupData.age,
                gender: signupData.gender,
                // Goals and activity
                activity_level: signupData.activityLevel,
                goal: signupData.goal,
                // Daily macro targets
                target_calories: signupData.macros.calories,
                target_protein: signupData.macros.protein,
                target_carbs: signupData.macros.carbs,
                target_fat: signupData.macros.fat,
            }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.message) {
            console.log("Signup successful:", data.message);
            return data as SignupResponse;
        } else {
            console.log("Signup failed:", data.error || "Unknown error");
            return { error: data.error || "Signup failed" };
        }
    } catch (error) {
        console.log("Signup error:", error);
        return { error: "Network error occurred during signup" };
    }
}

// Helper function to check if response is an error
export function isErrorResponse(response: LoginResponse | SignupResponse | ErrorResponse): response is ErrorResponse {
    return 'error' in response;
}

// Usage examples:
/*
// Login example
const loginResult = await login("john_doe", "mypassword");
if (isErrorResponse(loginResult)) {
    console.log("Login failed:", loginResult.error);
} else {
    console.log("Welcome back!", loginResult.user.username);
    // Store access token for authenticated requests
    const token = loginResult.access_token;
}

// Signup example
const signupResult = await signup("new_user", "securepassword", "vegetarian", "weight_loss");
if (isErrorResponse(signupResult)) {
    console.log("Signup failed:", signupResult.error);
} else {
    console.log("Account created successfully! User ID:", signupResult.user_id);
}
*/


export async function fetchUser(userId: string) {
    console.log("HERE - fetch")
    try {
        const response = await fetch(`${server}fetch-user/${userId}/`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}
"use client";
import {useState, useEffect} from "react";
import { getCurrentUser, signInWithRedirect, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import {generateClient} from "aws-amplify/data";
import type {Schema} from "@/amplify/data/resource";
import {Amplify} from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import {messages} from '../translations';
import { IntlProvider, FormattedMessage, useIntl } from "react-intl"; 

Amplify.configure(outputs);
const client = generateClient<Schema>();
function App() {
    const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
    const [username, setUsername] = useState<string | null>(null);
    const [locale, setLocale] = useState('en'); // Default to English
    const intl = useIntl();

    function listTodos() {
        client.models.Todo.observeQuery().subscribe({
            next: (data) => setTodos([...data.items]),
        });
    }

    function deleteTodo(id: string) {
        client.models.Todo.delete({id})
    }

    async function checkUserAuthentication() {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                const attributes = await fetchUserAttributes();        
                const displayName = attributes.email || currentUser.username || currentUser.userId;
                setUsername(displayName);
                return true;
            }
        } catch (error){
            console.error("Error getting current user:", error);
            setUsername(null);
            return false;
        }
    }

    useEffect(() => {
        const fetchTodos = async () => {
            const isAuthenticated = await checkUserAuthentication();
            if (isAuthenticated) {
                listTodos();
            }
        }
        fetchTodos();
    }, []);

    function createTodo() {
        client.models.Todo.create({
            content: window.prompt("Todo content"),
        });
    }

    const handleSignOut = async () => {
        await signOut();
        setUsername(null);
    }

    return (

        <main>
            {username ?
                <div>
                    <h1><FormattedMessage id="welcome" values={{ username }} /></h1>
                    <h1><FormattedMessage id="myTodos" /></h1>
                    <button onClick={createTodo}>+ new</button>
                    <ul>
                        {todos.map((todo) => (
                            <li key={todo.id} onClick={() => deleteTodo(todo.id)}>
                                {todo.content}
                            </li>
                        ))}
                    </ul>
                    <div>
                        <FormattedMessage id="appHosted" />
                        <br/>
                        <button onClick={handleSignOut}>
                        <FormattedMessage id="signOut" />
                        </button>
                    </div>
                </div> :
                <button onClick={() => signInWithRedirect({
                    provider: {custom: 'Auth0'}
                })}>
                    <FormattedMessage id="signInWithAuth0" />
                </button>
            }
        </main>
    );
}

export default function IntlApp() {
    return (
        <IntlProvider messages={messages['en']} locale="en" defaultLocale="en">
            <App />
        </IntlProvider>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, signInWithRedirect, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { Button } from '@mantine/core';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { messages } from '../translations';

Amplify.configure(outputs);
const client = generateClient<Schema>();
function App() {
    const [todos, setTodos] = useState<Array<Schema['Todo']['type']>>([]);
    const [username, setUsername] = useState<string | null>(null);
    // const [locale, setLocale] = useState('en'); // Default to English
    // const intl = useIntl();

    function listTodos() {
        client.models.Todo.observeQuery().subscribe({
            next: (data) => setTodos([...data.items]),
        });
    }

    function deleteTodo(id: string) {
        client.models.Todo.delete({ id });
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
            return false;
        } catch (error) {
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
        };
        fetchTodos();
    }, []);

    const handleSignOut = async () => {
        await signOut();
        setUsername(null);
    };

    return (

        <main>
            {username ?
                <div>
                    <h1><FormattedMessage id="welcome" values={{ username }} /></h1>
                    <h1><FormattedMessage id="myTodos" /></h1>
                    <Button>+ new</Button>
                    <ul>
                        {todos.map((todo) => (
                            <Button key={todo.id} onClick={() => deleteTodo(todo.id)}>
                                {todo.content}
                            </Button>
                        ))}
                    </ul>
                    <div>
                        <FormattedMessage id="appHosted" />
                        <br />
                        <Button onClick={handleSignOut}>
                          <FormattedMessage id="signOut" />
                        </Button>
                    </div>
                </div> :
                <Button onClick={() => signInWithRedirect({
                    provider: { custom: 'Auth0' },
                })}>
                    <FormattedMessage id="signInWithAuth0" />
                </Button>
            }
        </main>
    );
}

export default function IntlApp() {
    return (
        <IntlProvider messages={messages.en} locale="en" defaultLocale="en">
            <App />
        </IntlProvider>
    );
}

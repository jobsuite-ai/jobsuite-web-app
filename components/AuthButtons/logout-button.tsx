import classes from './Auth.module.css';

export const LogoutButton = () => {
    return (
        <a className={classes.largeLink} href="/api/auth/logout">
            Log Out
        </a>
    );
};

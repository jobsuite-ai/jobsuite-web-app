import classes from '../Shell/Header/Header.module.css';

export const LogoutButton = () => {
    return (
        <a className={classes.link} href="/api/auth/logout">
            Log Out
        </a>
    );
};

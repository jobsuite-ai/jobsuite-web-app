import classes from './Auth.module.css';

export const SignupButton = () => (
        <a className={classes.largeLink} href="/api/auth/signup">
            Sign Up
        </a>
    );

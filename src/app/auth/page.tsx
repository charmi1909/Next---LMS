'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpenText, Mail, Lock, User, Phone, MapPin, CalendarDays, Library, KeyRound, Eye, EyeOff } from 'lucide-react';
import './auth.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: '',
    role: 'patron',
  });
  const [message, setMessage] = useState('');
  const [showLibrarianCodePrompt, setShowLibrarianCodePrompt] = useState(false);
  const [librarianCode, setLibrarianCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setForm((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const validation = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const passwordChecks = {
      minLength: form.password.length >= 8,
      upperCase: /[A-Z]/.test(form.password),
      number: /\d/.test(form.password),
    };
    const signupNameValid = isLogin || form.name.trim().length >= 2;
    return {
      emailValid,
      passwordChecks,
      signupNameValid,
      passwordStrong: passwordChecks.minLength && passwordChecks.upperCase && passwordChecks.number,
    };
  }, [form.email, form.password, form.name, isLogin]);

  const handleSubmit = async () => {
    setMessage('');
    setForgotMessage('');

    if (!validation.emailValid) {
      setMessage('Please enter a valid email address.');
      return;
    }

    if (!isLogin && !validation.signupNameValid) {
      setMessage('Name must be at least 2 characters long.');
      return;
    }

    if (!validation.passwordChecks.minLength) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', form.email.trim());
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        if (isLogin) {
          if (data.user.role === 'librarian') {
            setShowLibrarianCodePrompt(true);
          } else if (data.user.role === 'admin') {
            router.push('/dashboard/admin');
          } else {
            router.push('/dashboard/patron');
          }
        } else {
          setIsLogin(true);
          setMessage('Registration successful! Please login.');
          setForm({
            name: '',
            email: '',
            password: '',
            phone: '',
            address: '',
            dob: '',
            role: 'patron',
          });
        }
      } else {
        setMessage(data.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage('Network error or server issue. Please try again later.');
    }
  };

  const handleModeToggle = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setShowLibrarianCodePrompt(false);
    setLibrarianCode('');
    setShowPassword(false);
    setShowForgotPassword(false);
    setForgotMessage('');
    setForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      dob: '',
      role: 'patron',
    });
  };

  const handleForgotPassword = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotMessage('Enter a valid email to continue.');
      return;
    }
    setForgotMessage('Password reset link sent. Please check your email inbox.');
  };

  const verifyLibrarianCode = () => {
    const correctCode = process.env.NEXT_PUBLIC_LIBRARIAN_CODE || 'charmi19';

    if (librarianCode.trim() === correctCode) {
      router.push('/dashboard/librarian');
    } else {
      setMessage('Invalid librarian secret code.');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <BookOpenText size={20} />
          </div>
          <span>Library Management</span>
        </div>

        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin
            ? 'Sign in to manage books, users, and library activity.'
            : 'Register as a patron or librarian to start using the system.'}
        </p>

        <form onSubmit={handleSubmitForm}>
          {!isLogin && (
            <>
              <div className="input-group">
                <input
                  name="name"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                <span className="input-icon"><User size={16} /></span>
              </div>

              <div className="input-group">
                <input
                  name="phone"
                  placeholder="Contact Number"
                  value={form.phone}
                  onChange={handleChange}
                />
                <span className="input-icon"><Phone size={16} /></span>
              </div>

              <div className="input-group">
                <input
                  name="address"
                  placeholder="Address"
                  value={form.address}
                  onChange={handleChange}
                />
                <span className="input-icon"><MapPin size={16} /></span>
              </div>

              <div className="input-group">
                <input
                  name="dob"
                  type="date"
                  placeholder="Date of Birth"
                  value={form.dob}
                  onChange={handleChange}
                />
                <span className="input-icon"><CalendarDays size={16} /></span>
              </div>
            </>
          )}

          <div className="input-group">
            <input
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="input-icon"><Mail size={16} /></span>
          </div>

          <div className="input-group">
            <input
              name="password"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              required
            />
            <span className="input-icon"><Lock size={16} /></span>
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="validation-list">
            <span className={validation.emailValid ? 'valid' : 'invalid'}>Valid email format</span>
            <span className={validation.passwordChecks.minLength ? 'valid' : 'invalid'}>At least 8 characters</span>
            <span className={validation.passwordChecks.upperCase ? 'valid' : 'invalid'}>One uppercase letter</span>
            <span className={validation.passwordChecks.number ? 'valid' : 'invalid'}>One number</span>
          </div>

          {!isLogin && (
            <div className="input-group">
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="patron">Patron</option>
                <option value="librarian">Librarian</option>
              </select>
              <span className="input-icon"><Library size={16} /></span>
            </div>
          )}

          <div className="auth-utility-row">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            {isLogin && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => {
                  setShowForgotPassword((prev) => !prev);
                  setForgotMessage('');
                  setForgotEmail(form.email);
                }}
              >
                Forgot password?
              </button>
            )}
          </div>

          <button type="submit" className="primary-button">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {showForgotPassword && (
          <div className="forgot-panel">
            <p className="forgot-title">Reset your password</p>
            <div className="input-group">
              <input
                type="email"
                placeholder="Enter your account email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <span className="input-icon"><Mail size={16} /></span>
            </div>
            <button type="button" className="primary-button forgot-btn" onClick={handleForgotPassword}>
              Send Reset Link
            </button>
            {forgotMessage && <p className="forgot-message">{forgotMessage}</p>}
          </div>
        )}

        {message && (
          <p className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}

        <div
          className="toggle-link"
          onClick={handleModeToggle}
        >
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span>{isLogin ? 'Sign Up' : 'Sign In'}</span>
        </div>
      </div>

      {showLibrarianCodePrompt && (
        <div className="auth-card auth-card-secondary">
          <h3>Librarian Verification</h3>
          <p className="auth-subtitle">Enter your librarian security code to continue.</p>
          <div className="input-group">
            <input
              placeholder="Librarian Code"
              value={librarianCode}
              onChange={(e) => setLibrarianCode(e.target.value)}
            />
            <span className="input-icon"><KeyRound size={16} /></span>
          </div>
          <button onClick={verifyLibrarianCode} className="primary-button">
            Submit Code
          </button>
        </div>
      )}
    </div>
  );
}

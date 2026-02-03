import { RegisterByInvitationForm } from '@/widgets/register-by-invitation/register-by-invitation-form';

export const RegisterByInvitationPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <RegisterByInvitationForm />
    </div>
  );
};

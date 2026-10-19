const AuthLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="flex-1 w-full flex items-center justify-center px-4 py-8">
      {children}
    </div>
  )
}

export default AuthLayout
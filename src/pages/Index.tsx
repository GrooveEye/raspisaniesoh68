import { Users, GraduationCap, BookOpen, Palette, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { teachers, classes, subjects, extracurriculars } = useApp();

  const stats = [
    { title: "Учителя", count: teachers.length, icon: Users, link: "/teachers", color: "text-blue-600" },
    { title: "Классы", count: classes.length, icon: GraduationCap, link: "/classes", color: "text-green-600" },
    { title: "Предметы", count: subjects.length, icon: BookOpen, link: "/subjects", color: "text-purple-600" },
    { title: "Внеурочка", count: extracurriculars.length, icon: Palette, link: "/extracurricular", color: "text-pink-600" },
  ];

  const hasData = teachers.length > 0 || classes.length > 0 || subjects.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Система управления учебным планом</h1>
        <p className="text-muted-foreground mt-1">
          Автоматическое формирование учебного плана и распределение нагрузки
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.count}</div>
              <Link to={stat.link}>
                <Button variant="link" className="p-0 h-auto text-sm">
                  Перейти <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Начало работы</CardTitle>
            <CardDescription>Заполните справочники для формирования учебного плана</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>1. Добавьте <Link to="/teachers" className="text-primary underline">учителей</Link></p>
            <p>2. Создайте <Link to="/classes" className="text-primary underline">классы</Link></p>
            <p>3. Настройте <Link to="/subjects" className="text-primary underline">предметы</Link> с часами</p>
            <p>4. Добавьте <Link to="/extracurricular" className="text-primary underline">внеурочную деятельность</Link></p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
